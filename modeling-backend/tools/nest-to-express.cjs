// tools/nest-to-express.cjs
// A pragmatic codemod: reads *.controller.ts with Nest decorators and emits Express Router files.
// Usage: node tools/nest-to-express.cjs src
// Output: for each Foo.controller.ts => Foo.express.router.ts next to it.

const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');
const fs = require('fs');

const srcRoot = process.argv[2] || 'src';

// map Nest method decorator -> Express HTTP method
const METHOD_MAP = {
  Get: 'get',
  Post: 'post',
  Put: 'put',
  Patch: 'patch',
  Delete: 'delete',
  All: 'all',
};

// extract string literal value if exists
function getDecoratorArgString(dec) {
  const args = dec.getArguments();
  if (!args || !args.length) return '';
  const a0 = args[0];
  if (a0 && a0.getKind() === SyntaxKind.StringLiteral) {
    return a0.getLiteralText() || '';
  }
  return '';
}

// crude param mapping note (we don’t rewrite method bodies)
function buildHandler(controllerClassName, method) {
  // try to read original method name
  const name = method.getName();
  // Collect parameter hints: @Body() @Param('id') @Query() @Req() @Res()
  const params = method.getParameters().map(p => {
    const decorators = p.getDecorators().map(d => d.getName());
    const hasBody = decorators.includes('Body');
    const hasParam = decorators.includes('Param');
    const hasQuery = decorators.includes('Query');
    const hasReq = decorators.includes('Req');
    const hasRes = decorators.includes('Res');
    const paramArg =
      p.getDecorators().find(d => d.getName() === 'Param')?.getArguments()?.[0];
    const paramKey = paramArg && paramArg.getKind() === SyntaxKind.StringLiteral
      ? paramArg.getLiteralText()
      : null;

    if (hasReq) return 'req';
    if (hasRes) return 'res';
    if (hasBody) return 'req.body';
    if (hasQuery) return 'req.query';
    if (hasParam && paramKey) return `req.params['${paramKey}']`;
    if (hasParam) return 'req.params';
    // fallback
    return 'req';
  });

  const args = params.join(', ');

  // we call controller instance method; DI wiring is passed via factory
  return `
routerHandler['${name}'] = async (req, res) => {
  try {
    const out = await ctrl.${name}(${args});
    // If controller returned a value (not using @Res), send it:
    if (out !== undefined) return res.json(out);
  } catch (e) {
    console.error('[${controllerClassName}.${name}]', e?.message || e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};
`;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const project = new Project({
  tsConfigFilePath: fs.existsSync(path.join(srcRoot, 'tsconfig.json'))
    ? path.join(srcRoot, 'tsconfig.json')
    : undefined,
  skipAddingFilesFromTsConfig: true,
});

// load all controller files
const glob = require('glob');
const controllerFiles = glob.sync(path.join(srcRoot, '**/*.controller.ts'));

if (!controllerFiles.length) {
  console.log('No *.controller.ts found under', srcRoot);
  process.exit(0);
}

controllerFiles.forEach(filePath => {
  project.addSourceFileAtPath(filePath);
});

const srcFiles = project.getSourceFiles();

srcFiles.forEach(sf => {
  const classes = sf.getClasses();
  const controllers = classes
    .map(cls => {
      const dec = cls.getDecorators().find(d => d.getName() === 'Controller');
      if (!dec) return null;
      const base = getDecoratorArgString(dec) || '';
      return { cls, base };
    })
    .filter(Boolean);

  if (!controllers.length) return;

  controllers.forEach(({ cls, base }) => {
    const className = cls.getName() || 'AnonymousController';

    // collect methods with HTTP decorators
    const methods = cls.getMethods().map(m => {
      const httpDec = m.getDecorators().find(d => METHOD_MAP[d.getName()]);
      if (!httpDec) return null;
      const httpName = httpDec.getName();
      const httpMethod = METHOD_MAP[httpName];
      const subPath = getDecoratorArgString(httpDec) || '';
      return { method: m, httpMethod, subPath };
    }).filter(Boolean);

    if (!methods.length) return;

    // build router file content
    const relDir = path.dirname(sf.getFilePath());
    const outFile = path.join(
      relDir,
      path.basename(sf.getFilePath()).replace('.controller.ts', '.express.router.ts')
    );

    const importOriginal = `import { ${className} } from './${path.basename(sf.getFilePath()).replace('.ts','')}';`;
    const expressImport = `import { Router } from 'express';`;

    const routeMappings = methods.map(({ method, httpMethod, subPath }) => {
      const cleanBase = (base || '').replace(/^\//, '');
      const cleanSub = (subPath || '').replace(/^\//, '');
      const full = '/' + [cleanBase, cleanSub].filter(Boolean).join('/'); // always slash-prefixed
      const handlerName = method.getName();
      return `router.${httpMethod}('${full}', routerHandler['${handlerName}']);`;
    }).join('\n');

    // build handler wrappers
    const handlerBodies = methods.map(({ method }) => buildHandler(className, method)).join('\n');

    const fileText = `/* AUTO-GENERATED by nest-to-express.cjs
   - You may edit DI wiring in create${className}Router()
   - This wraps ${className} methods as Express routes.
*/
${expressImport}
${importOriginal}

export function create${className}Router(deps = {}) {
  const router = Router();
  // TODO DI: construct controller with real dependencies if needed:
  // const ctrl = new ${className}(deps.myService, deps.other?);
  const ctrl = new ${className}();

  // handlers:
  const routerHandler = {};
  ${handlerBodies}

  // routes:
  ${routeMappings}

  return router;
}
`;

    ensureDir(path.dirname(outFile));
    fs.writeFileSync(outFile, fileText, 'utf8');
    console.log('Generated:', path.relative(process.cwd(), outFile));
  });
});

console.log('Done.');
