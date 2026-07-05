import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

RUNNER_TOKEN = os.getenv("SANDBOX_RUNNER_TOKEN", "")
HOST = os.getenv("SANDBOX_RUNNER_HOST", "0.0.0.0")
PORT = int(os.getenv("SANDBOX_RUNNER_PORT", "8088"))


def evaluate(code: str, test_cases: list[dict]):
    has_solve = "def solve" in code
    avoids_collect = "collect(" not in code
    avoids_pandas = "toPandas(" not in code

    results = []
    for case in test_cases:
        required = case.get("requiredPatterns") or []
        passed_patterns = all(str(p).replace(" ", "").lower() in code.replace(" ", "").lower() for p in required)
        passed = has_solve and avoids_collect and avoids_pandas and (passed_patterns or len(required) == 0)
        results.append(
            {
                "id": case.get("id", "case"),
                "name": case.get("name", "Unnamed"),
                "visibility": case.get("visibility", "hidden"),
                "passed": passed,
            }
        )

    if not test_cases:
        results = [
            {"id": "fallback-public", "name": "Fallback public", "visibility": "public", "passed": has_solve and avoids_collect}
        ]

    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    pub = [r for r in results if r["visibility"] == "public"]
    hid = [r for r in results if r["visibility"] == "hidden"]

    status = "passed" if passed == total else "failed"
    score = max(0, int((passed / max(1, total)) * 100))

    return {
        "status": status,
        "runtimeMs": 280,
        "memoryMb": 96,
        "score": score,
        "checks": {
            "hasSolve": has_solve,
            "avoidsCollect": avoids_collect,
            "avoidsPandas": avoids_pandas,
        },
        "tests": {
            "total": total,
            "passed": passed,
            "public": {"total": len(pub), "passed": sum(1 for r in pub if r["passed"])},
            "hidden": {"total": len(hid), "passed": sum(1 for r in hid if r["passed"])},
            "results": results,
        },
    }


class Handler(BaseHTTPRequestHandler):
    def _send(self, payload: dict, status: int = 200):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/health":
            self._send({"ok": True, "service": "spark-runner"})
            return
        self._send({"error": "Not found"}, 404)

    def do_POST(self):
        if self.path != "/execute":
            self._send({"error": "Not found"}, 404)
            return

        token = self.headers.get("x-runner-token", "")
        if RUNNER_TOKEN and token != RUNNER_TOKEN:
            self._send({"error": "Unauthorized runner token"}, 401)
            return

        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8")
        body = json.loads(raw or "{}")

        code = str(body.get("code", ""))
        test_cases = body.get("testCases") or []

        result = evaluate(code, test_cases)
        self._send(result)


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), Handler)
    print(f"spark-runner listening on {HOST}:{PORT}")
    server.serve_forever()
