import sqlite3

conn = sqlite3.connect("database.db")

cur = conn.cursor()

# =========================================
# ADD NEW COLUMNS SAFELY
# =========================================
try:

    cur.execute("""
    ALTER TABLE users
    ADD COLUMN room_id TEXT
    """)

except:
    pass


try:

    cur.execute("""
    ALTER TABLE users
    ADD COLUMN viva_status TEXT
    """)

except:
    pass




conn.commit()

conn.close()

print("DSA progress table updated.")