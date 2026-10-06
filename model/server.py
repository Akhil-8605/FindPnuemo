import os
import sys
import argparse
import uvicorn

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def run():
    parser = argparse.ArgumentParser(description="Run FindPneumo AI Detection Server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host interface (default 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="Port number (default 8000)")
    parser.add_argument("--reload", action="store_true", help="Enable hot reload")
    args = parser.parse_args()

    print("=" * 65)
    print("      FindPneumo AI - DenseNet-121 Pneumonia Detection API      ")
    print(f"      Server running at: http://{args.host}:{args.port}         ")
    print(f"      Interactive Docs:  http://localhost:{args.port}/docs     ")
    print("=" * 65)

    uvicorn.run("api.main:app", host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    run()
