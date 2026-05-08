"""
Run database migrations explicitly.
"""

from database import init_db


if __name__ == "__main__":
    init_db()
    print("Migrations applied.")
