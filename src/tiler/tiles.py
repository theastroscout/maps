import shutil
import os

import sqlite3

import json
import re

# Shapely
from shapely import set_precision, to_geojson
from shapely.geometry import box, mapping
from shapely.wkt import loads as shape_load
from shapely.geometry import LineString
from shapely.ops import linemerge

import mercantile
import geopandas as gpd
import pandas as pd

import multiprocessing
from multiprocessing.pool import ThreadPool

from collections import namedtuple
DB = namedtuple('DB', ['conn', 'cursor'])

import time

# Geometry Types for Index
geometries = ['Point', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon']

def convert_to_3d(arr):
	if isinstance(arr[0][0], int):
		return arr

	def flat(arr):
		result = []
		for row in arr:
			if isinstance(row[0][0], int):
				result.append(row)
			else:
				result.extend(flat(row))
		return result

	result = flat(arr)

	if len(result) == 1:
		result = result[0]
	return result


def fix_coords(items):
	result = []
	for item in items:
		if isinstance(item, tuple):
			result.append(fix_coords(item))
		else:
			result.append(round(item * 1_000_000))
	return result

class Tiles:

	def __init__(self, ):

		if 'update_only' not in CONFIG:
			# Clean Tile Directory
			shutil.rmtree(CONFIG['data'], ignore_errors=True)

		# Create 
		os.makedirs(CONFIG['data'], exist_ok=True)


		CONFIG['group_index'] = {}
		self.dict = []

		g_id = 0 # Group ID

		for group_name, group in CONFIG['groups'].items():
			CONFIG['group_index'][group_name] = {
				'id': g_id,
				'layers': {}
			}

			l_id = 0 # Layer ID
			layers = []

			for layer_name, layer in group.items():
				CONFIG['group_index'][group_name]['layers'][layer_name] = l_id
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

		
		with open(CONFIG['data'] + '/config.json', 'w') as dict_file:
			json.dump(self.dict, dict_file, indent='\t')


	def go(self,):
		# Create DB

		conn = sqlite3.connect(CONFIG['db_file'], check_same_thread=False)
		conn.enable_load_extension(True)
		conn.execute("SELECT load_extension('mod_spatialite')")
		cursor = conn.cursor()

		cursor.execute("SELECT data FROM config_data WHERE name='bbox'")
		result = cursor.fetchone()
		bbox = json.loads(result[0])
		print('BBox', bbox);

		bunch = []

		for zoom in (2, 4, 6, 8, 10, 12, 14, 15, 16, 17): # Full Set
		# for zoom in (2, 4, 6, 8, 10, 12, 14, 15):
		# for zoom in [12]:

			'''

			Collect Layers visible at Zoom

			'''

			# layers = []
			group_layers = []
			for group_name, group in CONFIG['groups'].items():
				for layer_name, layer in group.items():
					if layer['minzoom'] <= zoom: # and group_name in ['nature', 'roads']:
						group_layers.append(group_name + ':' + layer_name)
						# layers.append(layer_name)

			if not len(group_layers):
				continue

			group_layers_param = ', '.join('?' for _ in group_layers)

			# options = [ DB, self.config, self.groups, group_layers, group_layers_param, ]
			options = [ group_layers, CONFIG ]
			# bunch = []
			for tile in mercantile.tiles(bbox[0], bbox[1], bbox[2], bbox[3], zooms=zoom, truncate=False):
				# print(tile)
				bunch.append([tile] + options)




		'''

		Run Pool

		'''

		'''
		pool = ThreadPool(processes=8)
		results = pool.map(create_tile, bunch)
		pool.close()
		pool.join()

		'''

		num_cores = multiprocessing.cpu_count()
		# num_cores = 1

		with multiprocessing.Pool(processes=num_cores) as pool:
			pool.map(create_tile, bunch)
			# pool.close()
			# pool.join()
		

'''


Create Title


'''

def create_tile(data):

	# Prepare data
	tile, group_layers, CONFIG = data
	x,y,z = tile
	zoom = str(z)
	group_layers_param = ', '.join('?' for _ in group_layers)

	# DB
	conn = sqlite3.connect(CONFIG['db_file'])
	conn.enable_load_extension(True)
	conn.execute("SELECT load_extension('mod_spatialite')")

	# Get Tile Boundaries
	tile_bounds = mercantile.bounds(tile)
	tile_bounds = box(tile_bounds.west, tile_bounds.south, tile_bounds.east, tile_bounds.north)

	# Select Features inside Boundary
	query = f'''SELECT id, oid, `group`, layer, data,
	Hex(ST_AsBinary(coords)) as coords
	FROM features WHERE group_layer IN ({group_layers_param})
	and Intersects(coords, ST_GeomFromText(?))'''
	
	params = group_layers + [tile_bounds.wkt]
	
	tile_gdf = gpd.GeoDataFrame.from_postgis(query, conn, geom_col='coords', params=tuple(params))

	if tile_gdf.empty:
		# Skip if tile is empty
		return True

	'''

	Clip Tile excluding Buildings

	'''

	buildings =  tile_gdf[tile_gdf.group == 'buildings']
	non_buildings =  tile_gdf[tile_gdf.group != 'buildings']
	non_buildings = gpd.clip(non_buildings, tile_bounds)

	tile_gdf = pd.concat([non_buildings, buildings])

	if tile_gdf.empty:
		return True # Skip if tile is empty

	'''

	Create Tile File

	'''

	tile_dir = CONFIG['data'] + '/{}/{}'.format(z,x)
	tile_file_path = f'{tile_dir}/{y}'
	os.makedirs(tile_dir, exist_ok=True)

	try:
		os.remove(tile_file_path)
	except OSError:
		pass

	tile_file = open(tile_file_path, 'w')

	'''
	
	Loop through all features to compress and prepare for storing

	'''

	for index, feature in tile_gdf.iterrows():

		if feature.coords.geom_type == 'MultiLineString':
			feature.coords = linemerge(feature.coords)

		layer = CONFIG['groups'][feature.group][feature.layer]

		'''

		Compress Geometry

		'''

		if 'compress' in layer and str(zoom) in layer['compress']:
			compress = layer['compress'][str(zoom)]
			
			if 'tolerance' in compress:
				# print('Before', feature.coords.length)
				feature.coords = feature.coords.simplify(tolerance=compress['tolerance'], preserve_topology=True)

				if feature.coords.length == 0:
					print('Empty', feature.coords.length)

			if 'drop' in compress:
				
				if feature.coords.geom_type in ['Polygon', 'MultiPolygon']:
					# Polygon Drop

					if feature.coords.area < compress['drop']:
						continue

				elif feature.coords.geom_type == 'LineString' and  feature.coords.length < compress['drop']:
					# Line Drop
					continue
			else:
				if feature.coords.geom_type in ['Polygon', 'MultiPolygon']:
					# Polygon Drop

					if feature.coords.area == 0:
						print('Polygon Dropped')
						continue

				elif feature.coords.geom_type == 'LineString' and feature.coords.length == 0:
					# Line Drop
					print('Line Dropped')
					continue


		# Fit coordinates
		coords = mapping(feature.coords)
		geom_type = coords['type']

		coords = fix_coords(coords['coordinates'])

		# Normalize Polygons
		if geom_type in ['Polygon', 'MultiPolygon']:
			coords = convert_to_3d(coords)
			if isinstance(coords[0][0], int):
				geom_type = 'Polygon'
			else:
				geom_type = 'MultiPolygon'

		'''

		Feature Line (Item)

		'''
		
		item = [
			str(feature.oid),
			str(geometries.index(geom_type)),
			str(CONFIG['group_index'][feature.group]['id']),
			str(CONFIG['group_index'][feature.group]['layers'][feature.layer])
		]

		'''

		Extract Additional Data from DB according to CONFIG

		'''

		feature.data = json.loads(feature.data) or {}

		if 'data' in layer:

			for tag in layer['data']:

				'''

					tag: {
						"field": "name",
						"type": "*"
					}

				'''

				tag_name = tag['field']
				tag_type = tag['type']

				if tag_name in feature.data:
					
					v = feature.data[tag_name]

					if tag_name == 'name' and v:
						# Remove Everything in brackets, e.g. Westferry (DLR) > Westferry
						v = feature.data[tag_name] = re.sub(r'\([^)]*\)', '', v).strip()
					
					if tag_type == '*':
						if not v:
							feature.data[tag_name] = ''
					elif tag_type == 'bool':
						feature.data[tag_name] = '1' if v else '0'
					elif isinstance(tag_type, list):

						# Get Dictionary ID if tag presents in Dictionary (CONFIG)
						dict_value = '0'
						for index, t in enumerate(tag_type):
							
							'''
							
							t: {
								"name": "London Underground",
								"icon": "uk-tfl-lu"
							}

							'''

							if t['name'] == v:
								dict_value = str(index)
								break;

						feature.data[tag_name] = dict_value


		# Append Extra Data
		data = '\t'.join(list((feature.data).values()))
		if len(data):
			item.append(data)


		# Append Coords

		coords = json.dumps(coords, separators=(',', ':'))
		item.append(coords)

		item = '\t'.join(item) # Flatten Feature
		
		tile_file.write(item + '\n') # Write Feature


	tile_file.close() # Close Tile File

	# timePoint('Done')


'''

Time Point

'''

point_time = time.time()

def timePoint(msg='default'):
	global point_time
	execution_time = time.time() - point_time
	print('Time {}: {:.4f} seconds'.format(msg, execution_time))
	point_time = time.time()
	return execution_time



'''

Create Tiles Global Run

'''


def create_tiles(conf):
	global CONFIG

	CONFIG = conf

	start_time = time.time()
	tiles = Tiles()

	tiles.go()

	execution_time = time.time() - start_time
	print('Tiles render time: {:.2f} minutes'.format(execution_time / 60))

if __name__ == '__main__':
	config_name = 'canary'
	# config_name = 'london'
	# config_name = 'isle-of-dogs'
	
	settings = json.load(open('./configs/{}.json'.format(config_name), 'r'))

	filters = json.load(open('./config.json'))

	CONFIG = {**settings, **filters}
	CONFIG['update_only'] = True

	create_tiles(CONFIG)