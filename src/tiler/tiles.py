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
from concurrent.futures import ThreadPoolExecutor

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

	def __init__(self, config):
		self.config = config

		# Clear Tiles Directory
		shutil.rmtree(self.config['data'], ignore_errors=True)
		os.makedirs(self.config['data'], exist_ok=True)

		# Create DB
		conn = sqlite3.connect(self.config['db_file'])
		conn.enable_load_extension(True)
		conn.execute("SELECT load_extension('mod_spatialite')")
		cursor = conn.cursor()

		# DB Object
		self.db = DB(conn, cursor)


		self.groups = {}
		self.dict = []

		g_id = 0
		for group_name, group in self.config['groups'].items():
			self.groups[group_name] = {
				'id': g_id,
				'layers': {}
			}

			l_id = 0
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

		
		with open(self.config['data'] + '/config.json', 'w') as dict_file:
			json.dump(self.dict, dict_file, indent='\t')


	def go(self,):

		self.db.cursor.execute("SELECT data FROM config_data WHERE name='bbox'")
		result = self.db.cursor.fetchone()
		bbox = json.loads(result[0])

		bunch = []

		for zoom in (2, 4, 6, 8, 10, 12, 14, 15, 16, 17):
		# for zoom in [17]:

			'''

			Collect Layers visible at Zoom

			'''

			# layers = []
			group_layers = []
			for group_name, group in self.config['groups'].items():
				for layer_name, layer in group.items():
					if layer['minzoom'] <= zoom: # and group_name in ['nature', 'roads']:
						group_layers.append(group_name + ':' + layer_name)
						# layers.append(layer_name)

			if not len(group_layers):
				continue

			group_layers_param = ', '.join('?' for _ in group_layers)

			options = [ self.config, self.groups, group_layers, group_layers_param, ]
			# bunch = []
			for tile in mercantile.tiles(bbox[0], bbox[1], bbox[2], bbox[3], zooms=zoom, truncate=False):
				bunch.append([tile] + options)

			

			'''
			with multiprocessing.Pool(processes=num_cores) as pool:
				pool.map_async(create_tile, bunch)
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
	tile, config, groups, group_layers, group_layers_param = data

	# Create DB
	conn = sqlite3.connect(config['db_file'])
	conn.enable_load_extension(True)
	conn.execute("SELECT load_extension('mod_spatialite')")
	
	x,y,z = tile
	zoom = str(z)
	
	'''
	
	Each Tile at Zoom level

	'''

	tile_bounds = mercantile.bounds(tile)
	tile_bounds = box(tile_bounds.west, tile_bounds.south, tile_bounds.east, tile_bounds.north)

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

	tile_dir = config['data'] + '/{}/{}'.format(z,x)
	tile_file_path = f'{tile_dir}/{y}'
	os.makedirs(tile_dir, exist_ok=True)
	tile_file = open(tile_file_path, 'w')

	# timePoint('Created File')

	for index, feature in tile_gdf.iterrows():

		if 1==2 and z == 15 and feature.group == 'roads' and feature.layer == 'service':
			print(z, feature.group, feature.layer)

		if feature.coords.geom_type == 'MultiLineString':
			feature.coords = linemerge(feature.coords)

		'''

		Parse Feature

		'''
		
		layer = config['groups'][feature.group][feature.layer]

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


		coords = mapping(feature.coords)
		geom_type = coords['type']

		coords = fix_coords(coords['coordinates'])

		if geom_type in ['Polygon','MultiPolygon']:
			coords = convert_to_3d(coords)
			if isinstance(coords[0][0], int):
				geom_type = 'Polygon'
			else:
				geom_type = 'MultiPolygon'


		'''

		Record Line Object (Item)

		'''
		
		item = [
			str(feature.oid),
			str(geometries.index(geom_type)),
			str(groups[feature.group]['id']),
			str(groups[feature.group]['layers'][feature.layer])
		]

		'''

		Additional Data

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
					
					if tag_type == '*':
						if not v:
							feature.data[tag_name] = ''
					elif tag_type == 'bool':
						feature.data[tag_name] = '1' if v else '0'
					elif isinstance(tag_type, list):

						if 'name' in feature.data:
							# Remove Everything in brackets
							feature.data['name'] = re.sub(r'\([^)]*\)', '', feature.data['name']).strip()

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


		data = '\t'.join(list((feature.data).values()))
		if len(data):
			item.append(data)

		# Coords
		coords = json.dumps(coords, separators=(',', ':'))
		item.append(coords)

		item = '\t'.join(item)

		# timePoint('JSON')
		
		tile_file.write(item + '\n')

		# timePoint('Written')


	tile_file.close()

	timePoint('Finish')
	# print(len(tile_gdf))
	# print('')

	# time.sleep(1)

	return True

'''

Time Point

'''

point_time = time.time()

def timePoint(msg='default'):
	global point_time
	execution_time = time.time() - point_time
	# print('Time {}: {:.4f} seconds'.format(msg, execution_time))
	point_time = time.time()
	return execution_time



'''

Create Tiles Global Run

'''


def create_tiles(CONFIG):

	start_time = time.time()
	tiles = Tiles(CONFIG)

	tiles.go()

	execution_time = time.time() - start_time
	print('Tiles time: {:.2f} minutes'.format(execution_time / 60))

if __name__ == '__main__':
	config_name = 'canary'
	config_name = 'london'
	config_name = 'isle-of-dogs'
	
	settings = json.load(open('./configs/{}.json'.format(config_name), 'r'))

	filters = json.load(open('./config.json'))

	CONFIG = {**settings, **filters}

	create_tiles(CONFIG)