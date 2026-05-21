import sqlite3

conn = sqlite3.connect('technofirst.db')

cursor = conn.cursor()

#cursor.execute('''DELETE FROM Users;''')
cursor.execute('''DELETE FROM PrintOrder;''')

# Save changes
conn.commit()

# Close database
conn.close()

print("Data deleted successfully!")