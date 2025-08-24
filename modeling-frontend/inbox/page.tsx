import ThreadList from "@/components/messaging/ThreadList";

export default function InboxPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">گفتگوها</h1>
      <ThreadList />
    </div>
  );
}
