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

import time

# from tiles import create_tiles

class Parse:

	def __init__(self, config):
		self.config = config
		self.config['bbox'] = [float('inf'), float('inf'), float('-inf'), float('-inf')]

	def go(self,):

		'''

			Parse PBF file

		'''
		

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
				`group_layer` TEXT,
				`data` TEXT,
				`coords` GEOMETRY,
				`bounds` GEOMETRY
			)
		''')
		cursor.execute('CREATE INDEX idx_geom ON features(bounds);')

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

		# Remove Node Cache File
		if os.path.exists(self.config['tmp_file']):
			os.remove(self.config['tmp_file'])

		# idx = 'dense_file_array,' + self.config['tmp_file']
		idx = 'sparse_file_array,' + self.config['tmp_file']
		handler.apply_file(self.config['pbf_input'], locations=True, idx=idx)

		# Remove Node Cache File
		if os.path.exists(self.config['tmp_file']):
			os.remove(self.config['tmp_file'])


		print('Bounding Box:', self.config['bbox'])
		self.db.cursor.execute('INSERT INTO config_data (`name`,`data`) VALUES (?, ?)', ('bbox', json.dumps(self.config['bbox'])) )
		# self.db.cursor.execute('ANALYZE;')
		self.db.conn.commit()

		self.close()

	def close(self,):

		'''

			Close DB

		'''

		self.db.cursor.close()
		self.db.conn.close()


if __name__ == '__main__':
	start_time = time.time()

	# config_name = 'canary'
	config_name = 'isle-of-dogs'
	config_name = 'london'
	
	settings = json.load(open('./configs/{}.json'.format(config_name), 'r'))

	filters = json.load(open('./config.json'))

	CONFIG = {**settings, **filters}

	# print(CONFIG)

	print('Parsing...', config_name)
	parse = Parse(CONFIG)
	parse.go()

	execution_time = time.time() - start_time
	print('Parsing time: {:.2f} minutes'.format(execution_time / 60))
	
	# print('Creating tiles...')
	# create_tiles(CONFIG)