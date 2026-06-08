type CommandCardProps = {
  commandsText: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  pending: boolean;
  sessionId: string;
};

export function CommandCard({ commandsText, onChange, onExecute, pending, sessionId }: CommandCardProps) {
  return (
    <section className="card command-card">
      <div className="card-title">
        <h2>Commands</h2>
        <span>Proto JSON</span>
      </div>
      <textarea
        spellCheck={false}
        value={commandsText}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Browser commands JSON"
      />
      <div className="actions">
        <button disabled={pending || !sessionId} onClick={onExecute}>Execute commands</button>
      </div>
    </section>
  );
}
