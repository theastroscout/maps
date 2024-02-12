import sqlite3
import json



if __name__ == '__main__':
	config_name = 'canary'
	
	settings = json.load(open('./configs/{}.json'.format(config_name), 'r'))

	filters = json.load(open('./config.json'))

	CONFIG = {**settings, **filters}

	

	conn = sqlite3.connect(CONFIG['db_file'])
	conn.enable_load_extension(True)
	conn.execute("SELECT load_extension('mod_spatialite')")

	cursor = conn.cursor()

	min_x, min_y, max_x, max_y = -10, -10, -5, -5

	# Execute a query to select features within the bounding box
	query = f"SELECT * FROM features"
	cursor.execute(query)

	# Fetch all rows
	rows = cursor.fetchall()
	for r in rows:
		print(r)
	cursor.close()
	conn.close()