import shutil
import os
import sqlite3
import json
from shapely.geometry import box
from shapely.wkt import loads as shape_load
import mercantile
import geopandas as gpd

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

		self.db.cursor.execute("SELECT data FROM config_data WHERE name='bbox'")
		result = self.db.cursor.fetchone()
		bbox = json.loads(result[0])
		print('BBOX',bbox)

		for zoom in (2, 4, 6, 8, 10, 12, 14):
			layers = []
			for group_name, group in self.config['groups'].items():
				for layer_name, layer in group.items():
					if layer['minzoom'] <= zoom:
						layers.append(layer_name)

			if not len(layers):
				continue

			layers_param = ", ".join('?' for _ in layers)

			for tile in mercantile.tiles(bbox[0], bbox[1], bbox[2], bbox[3], zooms=zoom, truncate=False):
				tile_bounds = mercantile.bounds(tile)
				# print(tile_bounds)
				
				tile_bounds = box(tile_bounds.west, tile_bounds.south, tile_bounds.east, tile_bounds.north)
				# print(tile_bounds.wkt)
				
				# AsText(`coords`) as 
				query = f'''SELECT id, oid, `group`, layer, data,
				Hex(ST_AsBinary(coords)) as coords
				FROM features WHERE layer IN ({layers_param})
				and Intersects(coords, ST_GeomFromText(?))'''
				# print(query)
				params = layers + [tile_bounds.wkt]
				gdf = gpd.GeoDataFrame.from_postgis(query, self.db.conn, geom_col='coords', params=tuple(params))

				if gdf.empty:
					continue

				for index, row in gdf.iterrows():
					print(row)
				exit()



				

		exit()

		for zoom in (2, 4, 6, 8, 10, 12, 14):

			# Collect Layers
			layers = []
			for group_name, group in self.config['groups'].items():
				for layer_name, layer in group.items():
					if layer['minzoom'] <= zoom:
						layers.append(layer_name)

			# Select Features
			params = ", ".join('?' for _ in layers)
			query = f"SELECT id, oid, `group`, layer, data, AsText(`coords`) FROM features WHERE layer IN ({params})"
			result = self.db.conn.execute(query, tuple(layers)).fetchall()
			
			if not result:
				# Empty level
				continue
			
			bbox = [float('inf'), float('inf'), float('-inf'), float('-inf')]
			for feature in result:
				# shape_load

				shape = shape_load(feature[5])
				
				bbox[0] = min(bbox[0], shape.bounds[0])
				bbox[1] = min(bbox[1], shape.bounds[1])
				bbox[2] = max(bbox[2], shape.bounds[2])
				bbox[3] = max(bbox[3], shape.bounds[3])

			print(zoom, bbox)

			for tile in mercantile.tiles(bbox[0], bbox[1], bbox[2], bbox[3], zooms=zoom, truncate=False):
				print(tile)

	def test(self,):

		self.db.cursor.execute("PRAGMA table_info(features);")
		columns = [column[1] for column in self.db.cursor.fetchall()]
		print('DB Columns', columns)


		min_x, min_y, max_x, max_y = -0.0224971329,51.5041493371,-0.0200334285,51.5006863218
		bbox = box(min_x, min_y, max_x, max_y)
		bbox = bbox.wkt

		query = f"SELECT id, oid, `group`, layer, data, AsText(`coords`) FROM features WHERE Intersects(coords, ST_GeomFromText(?))"
		result = self.db.conn.execute(query, (bbox,)).fetchall()
		print('Result', len(result))

		# POLYGON((-0.043632 51.500291, -0.043632 51.500291, -0.043632 51.500291, -0.043632 51.500291, -0.043632 51.500291))
		# -0.0436321
		self.db.cursor.execute('''SELECT AsText(ST_Envelope(ST_Union(coords))) as asd FROM features''')
		# print(self.db.cursor.fetchone()[0])

		
		for r in self.db.cursor.fetchall():
			print(r)

		return True

def create_tiles(CONFIG):
	tiles = Tiles(CONFIG)

	shutil.rmtree(CONFIG['data'], ignore_errors=True)
	os.makedirs(CONFIG['data'], exist_ok=True)

	tiles.go()

if __name__ == '__main__':
	config_name = 'canary'
	
	settings = json.load(open('./configs/{}.json'.format(config_name), 'r'))

	filters = json.load(open('./config.json'))

	CONFIG = {**settings, **filters}

	create_tiles(CONFIG)