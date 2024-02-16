'''

Convert PBF file into tiles

'''

import os
import sqlite3
import json
from utils.osm import OSM_handler
from tiles import create_tiles
from shapely.wkb import loads
from shapely.geometry import box

from collections import namedtuple
DB = namedtuple('DB', ['conn', 'cursor'])

# from tiles import create_tiles

class Parse:

	def __init__(self, config):
		self.config = config
		self.config['bbox'] = [float('inf'), float('inf'), float('-inf'), float('-inf')]

	def go(self,):
		

		# Remove Temp File
		if os.path.exists(self.config['tmp_file']):
			os.remove(self.config['tmp_file'])

		# Remove DB
		if os.path.exists(self.config['db_file']):
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
				`coords` GEOMETRY
			)
		''')
		cursor.execute('''
			CREATE TABLE config_data (
				`id` INTEGER PRIMARY KEY,
				`name` TEXT,
				`data` TEXT
			)
		''')
		conn.commit()

		# DB Object
		self.db = DB(conn, cursor)

		# Create Handler
		handler = OSM_handler(self.config, self.db)

		'''

		Parsing OSM

		'''

		# idx = 'dense_file_array,' + self.config['tmp_file']
		idx = 'sparse_file_array,' + self.config['tmp_file']
		handler.apply_file(self.config['pbf_input'], locations=True, idx=idx)

		# Remove Temp File
		if os.path.exists(self.config['tmp_file']):
			os.remove(self.config['tmp_file'])


		print('Bounding Box:', self.config['bbox'])
		self.db.cursor.execute('INSERT INTO config_data (`name`,`data`) VALUES (?, ?)', ('bbox', json.dumps(self.config['bbox'])) )
		self.db.conn.commit()

		# self.test()
		self.close()

		

	def test(self,):
		self.db.cursor.execute("PRAGMA table_info(features);")
		columns = [column[1] for column in self.db.cursor.fetchall()]
		print('Columns', columns)

		min_x, min_y, max_x, max_y = -1, 50, 1, 51.5
		min_x, min_y, max_x, max_y = -0.0224971329,51.5041493371,-0.0200334285,51.5056863218
		# bbox = (min_x, min_y, max_x, max_y)
		bbox = box(min_x, min_y, max_x, max_y)
		bbox_str = bbox.wkt


		query = f"SELECT id, oid, `group`, layer, data, AsText(`coords`) FROM features WHERE MBRContains(BuildMBR({min_x}, {min_y}, {max_x}, {max_y}), coords)"
		query = f"SELECT id, oid, `group`, layer, data, AsText(`coords`) FROM features WHERE Intersects(coords, ST_GeomFromText(?))"
		result = self.db.conn.execute(query, (bbox_str,)).fetchall()
		print('Result', len(result))
		# for r in result:
		#	print(r)

		self.db.cursor.close()
		self.db.conn.close()

	def close(self,):
		self.db.cursor.close()
		self.db.conn.close()


if __name__ == '__main__':
	config_name = 'canary'
	
	settings = json.load(open('./configs/{}.json'.format(config_name), 'r'))

	filters = json.load(open('./config.json'))

	CONFIG = {**settings, **filters}

	# print(CONFIG)

	print('Parsing...')
	parse = Parse(CONFIG)
	parse.go()
	
	print('Creating tiles...')
	create_tiles(CONFIG)