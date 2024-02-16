import shutil
import os
import sqlite3
import json
import re
from shapely import set_precision, to_geojson
from shapely.geometry import box
from shapely.wkt import loads as shape_load
import mercantile
import geopandas as gpd

from collections import namedtuple
DB = namedtuple('DB', ['conn', 'cursor'])

# Geometry Types for Index
geometries = ['Point','LineString','MultiLineString','Polygon','MultiPolygon']



def fix_coords(items):
	result = []
	for item in items:
		if isinstance(item, list):
			result.append(fix_coords(item))
		else:
			result.append(round(item * 1_000_000))
	return result

class Tiles:

	def __init__(self, config):
		self.config = config

		# Clear Tiles Directory
		shutil.rmtree(CONFIG['data'], ignore_errors=True)
		os.makedirs(CONFIG['data'], exist_ok=True)

		# Create DB
		conn = sqlite3.connect(self.config['db_file'])
		conn.enable_load_extension(True)
		conn.execute("SELECT load_extension('mod_spatialite')")
		cursor = conn.cursor()

		# DB Object
		self.db = DB(conn, cursor)


		self.groups = {}
		self.dict = []

		g_id = 1
		for group_name, group in self.config['groups'].items():
			self.groups[group_name] = {
				'id': g_id,
				'layers': {}
			}



			l_id = 1
			layers = []
			for layer_name, layer in group.items():
				self.groups[group_name]['layers'][layer_name] = l_id
				l_id += 1

				layer_item = {
					'name': layer_name
				}
				if 'data' in layer:
					layer_item['data'] = layer['data']
				
				layers.append(layer_item)

			self.dict.append({
				'name': group_name,
				'layers': layers
				})

			g_id += 1

		print(self.dict)
		with open(CONFIG['data'] + '/config.json', "w") as dict_file:
			json.dump(self.dict, dict_file, indent='\t')
		exit()

	def go(self,):

		self.db.cursor.execute("SELECT data FROM config_data WHERE name='bbox'")
		result = self.db.cursor.fetchone()
		bbox = json.loads(result[0])
		print('BBOX',bbox)

		for zoom in (2, 4, 6, 8, 10, 12, 14):

			'''

			Collect Layers visible at Zoom

			'''

			layers = []
			for group_name, group in self.config['groups'].items():
				for layer_name, layer in group.items():
					if layer['minzoom'] <= zoom:
						layers.append(layer_name)

			if not len(layers):
				continue

			layers_param = ", ".join('?' for _ in layers)

			for tile in mercantile.tiles(bbox[0], bbox[1], bbox[2], bbox[3], zooms=zoom, truncate=False):

				x,y,z = tile

				print('Create', tile)
				
				'''
				
				Each Tile at Zoom level

				'''

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
				tile_gdf = gpd.GeoDataFrame.from_postgis(query, self.db.conn, geom_col='coords', params=tuple(params))

				if tile_gdf.empty:
					# Skip if tile is empty
					continue

				# Create File
				tile_dir = self.config['data'] + '/{}/{}'.format(z,x)
				tile_file_path = f'{tile_dir}/{y}'
				os.makedirs(tile_dir, exist_ok=True)
				tile_file = open(tile_file_path, 'w')

				for index, feature in tile_gdf.iterrows():

					'''

					Parse Feature

					'''
					
					layer = self.config['groups'][feature.group][feature.layer]
					if 'compress' in layer and str(zoom) in layer['compress']:
						compress = layer['compress'][str(zoom)]

						gdf = gpd.GeoDataFrame(geometry=[feature.coords])

						if 'tolerance' in compress:
							# print('compress It', zoom, tile.x, tile.y, feature.group, feature.layer, layer['compress'][str(zoom)])
							# print(gdf.geometry[0].length)
							# print(len(gdf.geometry[0].coords), gdf.geometry[0].length, gdf.geometry[0])
							gdf['geometry'] = gdf.simplify(tolerance=compress['tolerance'], preserve_topology=True)
							# print(len(gdf.geometry[0].coords), gdf.geometry[0].length, gdf.geometry[0])
							# print('')

						if gdf.empty:
							# Empty Drop
							continue

						if 'drop' in compress:
							
							if gdf.geometry[0].geom_type in ['Polygon', 'MultiPolygon']:
								# Polygon Drop

								if gdf.geometry[0].area < compress['drop']:
									continue

							elif gdf.geometry[0].length < compress['drop']:
								# Line Drop
								continue


						# Set Precision for coords, not necessary because we use fix_coords
						# gdf['geometry'] = set_precision(gdf.geometry.array, grid_size=0.000001)
						feature.coords = gdf.geometry[0]
						# print(gdf.geometry[0].geom_type)

					# coords = []

					# geometry_type, coords, offsets = to_ragged_array([feature.coords])
					
					# print(json.loads(to_geojson(feature.coords))['type'])
					coords = json.loads(to_geojson(feature.coords))['coordinates']
					coords = fix_coords(coords)
					if feature.coords.geom_type == 'Polygon' and len(coords) == 1:
						coords = coords[0]
					# print(feature.group, feature.layer, len(coords), coords)

					# Feature object to store
					
					item = [
						str(feature.oid),
						str(geometries.index(feature.coords.geom_type)),
						str(self.groups[feature.group]['id']),
						str(self.groups[feature.group]['layers'][feature.layer])
					]

					'''

					Additional Data

					'''

					feature.data = json.loads(feature.data) or {}

					if 'data' in layer:
						for tag in layer['data']:
							if tag in feature.data:
								tag_spec = layer['data'][tag]
								
								v = feature.data[tag]
								
								if tag_spec == '*':
									if not v:
										feature.data[tag] = ''
								elif tag_spec == 'bool':
									feature.data[tag] = '1' if v else '0'
								elif isinstance(tag_spec, dict):

									if 'name' in feature.data:
										# Remove Everything in brackets
										feature.data['name'] = re.sub(r'\([^)]*\)', '', feature.data['name']).strip()

									if v in tag_spec:
										feature.data[tag] = str(list(tag_spec.keys()).index(v))
									else:
										feature.data[tag] = '0'

					data = '\t'.join(list((feature.data).values()))
					if len(data):
						item.append(data)

					# Coords
					coords = json.dumps(coords, separators=(',', ':'))
					item.append(coords)

					item = '\t'.join(item)

					
					tile_file.write(item + '\n')

					# print(item)
					# shapely.to_ragged_array
					# elif coords.geom_type == 'LineString':


				tile_file.close()
				# exit()



				

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