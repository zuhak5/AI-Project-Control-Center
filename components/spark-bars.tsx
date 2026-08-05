export function SparkBars({ data }: { data: Array<{ label: string; requests: number; errors: number }> }) {
  const max = Math.max(...data.map((item) => item.requests), 1);
  return (
    <div className="spark-bars" aria-label="Seven-day request volume">
      {data.map((item) => {
        const height = Math.max(6, Math.round((item.requests / max) * 100));
        const errorHeight = item.requests ? Math.round((item.errors / item.requests) * height) : 0;
        return (
          <div className="spark-column" key={item.label} title={`${item.label}: ${item.requests} requests, ${item.errors} errors`}>
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${height}%` }}>
                {errorHeight > 0 ? <span className="bar-error" style={{ height: `${errorHeight}%` }} /> : null}
              </div>
            </div>
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
