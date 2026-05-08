"""Initialize MongoDB indexes explicitly."""

from database import init_db


if __name__ == "__main__":
    init_db()
    print("MongoDB indexes initialized.")
