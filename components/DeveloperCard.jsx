export default function DeveloperCard({ dev }) {
  return (
    <div className="p-4 border rounded shadow">
      <h2 className="font-bold">{dev.name}</h2>
      <p>{dev.role}</p>
    </div>
  );
}
