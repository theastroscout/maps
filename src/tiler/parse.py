'''

Convert PBF file into tiles

'''

import os
import sqlite3
import json
from utils.osm import OSM_handler
from tiles import test

class Parse:

	def __init__(self, config):
		self.config = config

	def go(self,):
		self.h = OSM_handler(self.config)

		# Remove Temp File
		if os.path.exists(self.config['tmp_file']):
			os.remove(self.config['tmp_file'])

		# Remove DB
		if os.path.exists(self.config['db_file']):
			print('Remove DB')
			os.remove(self.config['db_file'])

		# Create DB
		conn = sqlite3.connect(self.config['db_file'])
		conn.enable_load_extension(True)
		conn.execute("SELECT load_extension('mod_spatialite')")
		cursor = conn.cursor()
		cursor.execute('SELECT InitSpatialMetadata(1)')
		cursor.execute('''
			CREATE TABLE features (
				`id` INTEGER PRIMARY KEY,
				`oid` INTEGER,
				`group` TEXT,
				`layer` TEXT,
				`data` TEXT,
				`geom` GEOMETRY
			)
		''')
		conn.commit()

		self.config['db'] = {
			'conn': conn,
			'cursor': cursor
		}


		# Start parsing
		# idx = 'dense_file_array,' + self.config['tmp_file']
		idx = 'sparse_file_array,' + self.config['tmp_file']
		self.h.apply_file(self.config['pbf_input'], locations=True, idx=idx)

		# Remove Temp File
		if os.path.exists(self.config['tmp_file']):
			os.remove(self.config['tmp_file'])

		self.test()

	def test(self,):
		conn = self.config['db']['conn']
		cursor = self.config['db']['cursor']
		cursor.execute("PRAGMA table_info(features);")
		columns = [column[1] for column in cursor.fetchall()]
		print('Columns',columns)

		min_x, min_y, max_x, max_y = -1, 50, 1, 51.51

		query = f"SELECT oid, `group`, `geom` FROM features WHERE MBRContains(BuildMBR({min_x}, {min_y}, {max_x}, {max_y}), geom)"
		result = conn.execute(query).fetchall()
		print('Result', result)
		for r in result:
			print(r)

		cursor.close()
		conn.close()


if __name__ == '__main__':
	config_name = 'canary'
	
	settings = json.load(open('./configs/{}.json'.format(config_name), 'r'))

	filters = json.load(open('./config.json'))

	CONFIG = {**settings, **filters}

	# print(CONFIG)

	parse = Parse(CONFIG)
	parse.go()
	print('Complete')