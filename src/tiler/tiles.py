import sqlite3
import json
from shapely.geometry import box

from collections import namedtuple
DB = namedtuple('DB', ['conn', 'cursor'])

class Tiles:

	def __init__(self, config):
		self.config = config

		# Create DB
		conn = sqlite3.connect(self.config['db_file'])
		conn.enable_load_extension(True)
		conn.execute("SELECT load_extension('mod_spatialite')")
		cursor = conn.cursor()

		# DB Object
		self.db = DB(conn, cursor)

	def go(self,):

		self.db.cursor.execute("PRAGMA table_info(features);")
		columns = [column[1] for column in self.db.cursor.fetchall()]
		print('DB Columns', columns)


		min_x, min_y, max_x, max_y = -0.0224971329,51.5041493371,-0.0200334285,51.5056863218
		bbox = box(min_x, min_y, max_x, max_y)
		bbox = bbox.wkt

		query = f"SELECT id, oid, `group`, layer, data, AsText(`coords`) FROM features WHERE Intersects(coords, ST_GeomFromText(?))"
		result = self.db.conn.execute(query, (bbox,)).fetchall()
		print('Result', len(result))

		return True

if __name__ == '__main__':
	config_name = 'canary'
	
	settings = json.load(open('./configs/{}.json'.format(config_name), 'r'))

	filters = json.load(open('./config.json'))

	CONFIG = {**settings, **filters}

	tiles = Tiles(CONFIG)
	tiles.go()