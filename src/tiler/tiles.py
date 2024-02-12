import sqlite3
import json
import geopandas as gpd


def test():
	config_name = 'canary'
	
	settings = json.load(open('./configs/{}.json'.format(config_name), 'r'))

	filters = json.load(open('./config.json'))

	CONFIG = {**settings, **filters}

	

	conn = sqlite3.connect(CONFIG['db_file'])
	conn.enable_load_extension(True)
	conn.execute("SELECT load_extension('mod_spatialite')")
	conn.execute("SELECT InitSpatialMetadata(1)")

	cursor = conn.cursor()

	cursor.execute("PRAGMA table_info(features);")
	columns = [column[1] for column in cursor.fetchall()]
	print(columns)
	# exit()

	min_x, min_y, max_x, max_y = -100, -100, -50, -50

	query = f"SELECT oid, `group`, `GEOMETRY` FROM features WHERE MBRContains(BuildMBR({min_x}, {min_y}, {max_x}, {max_y}), GEOMETRY)"
	result = conn.execute(query).fetchall()
	for r in result:
		print(r)

	cursor.close()
	conn.close()

if __name__ == '__main__':
	test()