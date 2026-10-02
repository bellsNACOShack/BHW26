export default function NotFound() {
  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", textAlign: "center" }}>
      <h2>404 - Not Found</h2>
      <p>The requested page could not be found.</p>
      <a href="/docs" style={{ color: "#0066cc", textDecoration: "underline" }}>
        Go to Swagger UI Documentation
      </a>
    </div>
  );
}
