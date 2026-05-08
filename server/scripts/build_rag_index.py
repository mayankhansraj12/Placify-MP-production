"""
One-time script to build the RAG vector store from knowledge base files.
Run: python -m scripts.build_rag_index
"""
import sys
import os

# Fix Windows console encoding
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.rag_service import build_all_indexes


def main():
    print("=" * 50)
    print("Building Placify RAG Knowledge Base")
    print("=" * 50)

    results = build_all_indexes()

    print("\nResults:")
    total = 0
    for collection, count in results.items():
        status = "[ok]" if count > 0 else "[--]"
        print(f"  {status} {collection}: {count} documents indexed")
        total += count

    print(f"\nTotal: {total} documents indexed")
    if total > 0:
        print("RAG system is ready!")
    else:
        print("WARNING: No documents indexed. Check that knowledge files exist.")


if __name__ == "__main__":
    main()
