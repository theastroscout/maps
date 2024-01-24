'''

	Compress and Formating GeoJSON tiles

'''

import os
import time
import re
import json
import geopandas as gpd
from shapely.geometry import LineString, MultiLineString, Polygon, MultiPolygon, mapping
from shapely.ops import linemerge
import pandas as pd

import multiprocessing

# Geometry Types for Index
geometry = ['Point','LineString','MultiLineString','Polygon','MultiPolygon']

# Simplification Ration
simple = {
	'2': 0.001,
	'4': 0.001,
	'6': 0.001,
	'8': 0.001,
	'10': 0.001,
	'12': 0.00001,
	'14': 0.00001
}

# Vertices Counter
def count_vertices(df):
	return len(df.get_coordinates())

# Fix Coords Precision. Round Coords to 6 Decimals
def fix_coords_precision(coords):
	for idx, c in enumerate(coords):
		if isinstance(c, list):
			fix_coords_precision(c)
		else:
			coords[idx] = round(c, 6)
	return coords

'''

	Compress Tiles

'''

def compress_tiles(CONFIG):
	print('Compress tiles')

	# Load Compressor Config with simplification
	COMPRESSOR_CONFIG = json.load(open('./configs/compress.json', 'r'))

	start_time = time.time()

	tiles_dir = CONFIG['data']
	
	'''

	Collect Data for further processing

	'''

	bunch = []

	for root, dirs, files in os.walk(tiles_dir):
		for file in files:
			path = os.path.join(root, file)
			tile = re.findall(r'/(\d+)/(\d+)/(\d+)\.geojson', path)
			if tile:
				bunch.append([tile[0], COMPRESSOR_CONFIG, CONFIG])

	'''

	Processing Data

	'''
	if len(bunch):
		num_cores = multiprocessing.cpu_count()
		with multiprocessing.Pool(processes=num_cores) as pool:
				result = pool.map(compress, bunch)

	'''

	Output Statistics

	'''

	end_time = time.time()
	print('Tiles compressed in {}s'.format(round(end_time - start_time,3)))
	
	# Vertices
	before = sum(row[0] for row in result)
	after = sum(row[1] for row in result)
	print('Points {} / {} :: {}%'.format(before, after, round(after/before*100,2)))

'''

	Compress and Formating Tile Data

'''

def compress(data):
	
	# Get Input Params
	[tile, COMPRESSOR_CONFIG, CONFIG] = data

	# Extract Tile Features
	z,x,y = tile

	print('Compressing {}'.format(tile))

	geojson = CONFIG['data'] + '/{}/{}/{}.geojson'.format(z,x,y)
	output = CONFIG['data'] + '/{}/{}/{}'.format(z,x,y)
	
	'''

	# Load Data Frame
	df = gpd.read_file(geojson, driver='GeoJSON')

	OUTPUT = [count_vertices(df)]

	compressed_json = CONFIG['data'] + '/{}/{}/{}.compressed.geojson'.format(z,x,y)

	series = gpd.GeoSeries(df['geometry'])
	series = series.simplify(tolerance=.0001, preserve_topology=True)
	df['geometry'] = series

	print(df.crs)
	crs='EPSG:3395'
	df = df.to_crs(crs) if df.crs is not None else df
	df = df[df['geometry'].area >= .00001]

	crs='EPSG:4326'
	df = df.to_crs(crs) if df.crs is not None else df
	# print(df2)

	OUTPUT.append(count_vertices(df))

	if df.empty:
		return OUTPUT



	df.to_file(compressed_json, driver='GeoJSON', mode='w')

	geojson = compressed_json

	'''

	z = str(z)
	features = {}

	for group_name, group in CONFIG['groups'].items():
		features[group_name] = {}
		for layer_name in group:
			features[group_name][layer_name] = {}

	'''

	Parse Geo JSON

	'''

	# Load Geo JSON
	data = json.load(open(geojson, 'r'))

	# Parse Features
	for feature in data['features']:
		
		# Fix Coords Precision
		feature['geometry']['coordinates'] = fix_coords_precision(feature['geometry']['coordinates'])
		
		g_type = feature['geometry']['type']
		group = feature['properties']['group']
		layer = feature['properties']['layer']

		# if 'name' in feature['properties'] and feature['properties']['name']:
			# fID = group + layer + feature['properties']['name']
		#	fID = feature['properties']['name']
		# else:
		if group == 'roads' and 'name' in feature['properties']:
			fID = feature['properties']['name']
		else:
			fID = feature['properties']['id']

		# Create Feature
		if fID not in features[group][layer]:
			features[group][layer][fID] = {
				'type': g_type,
				'id': feature['properties']['id'],
				'group': group,
				'layer': layer,
				'coords': []
			}

		featureItem = features[group][layer][fID]


		if 'name' in feature['properties'] and feature['properties']['name']:
			featureItem['name'] = feature['properties']['name']

		if 'center' in feature['properties'] and feature['properties']['center']:
			featureItem['center'] = feature['properties']['center']

		
		if g_type in ['LineString','MultiLineString']:
			
			featureItem['type'] = 'MultiLineString'

			coords = feature['geometry']['coordinates']

			if g_type == 'LineString':
				coords = [coords]
			featureItem['coords'] = featureItem['coords'] + coords

		elif g_type == 'Polygon':
			featureItem['type'] = 'MultiPolygon'
			featureItem['coords'] = featureItem['coords'] + [feature['geometry']['coordinates']]
		elif g_type == 'MultiPolygon':
			featureItem['coords'] = featureItem['coords'] + feature['geometry']['coordinates']


	'''

		Write Features to the target file

	'''

	target = open(output, 'w')

	for group_key, [group, layers] in enumerate(features.items()):

		# Get Compressor Config

		compress_config = False
		if group in COMPRESSOR_CONFIG and z in COMPRESSOR_CONFIG[group]:
			compress_config = COMPRESSOR_CONFIG[group][z]


		for layer_key, [layer, feature_items] in enumerate(features[group].items()):

			for fID, feature in feature_items.items():

				coords = feature['coords']
				
				if feature['type'] == 'MultiLineString':
					coords = [LineString(c) for c in coords]
					coords = linemerge(coords)

					if coords.geom_type == 'LineString':
						feature['type'] = 'LineString'

						# Simplify Line String

						simplified_line = coords.simplify(simple[z])
						coords = list(simplified_line.coords)

					else:
						
						# Simplify MultiLine String

						new_coords = []
						for line in coords.geoms:
							simplified_line = line.simplify(simple[z])
							new_coords.append(list(simplified_line.coords))

						coords = new_coords;
				elif feature['type'] == 'Polygon':
					
					# We have no polygons
					print(coords)

				elif feature['type'] == 'MultiPolygon':

					# Compress MultiPolygon

					if compress_config:
						new_coords = []

						for multy_polygon in coords:
							multipolygon = MultiPolygon([Polygon(c) for c in multy_polygon])

							gdf = gpd.GeoDataFrame(geometry=[multipolygon])

							if 'tolerance' in compress_config:
								gdf['geometry'] = gdf.simplify(tolerance=compress_config['tolerance'], preserve_topology=True)

							if not gdf.empty and 'avoidArea' in compress_config:
								gdf = gdf[gdf['geometry'].area >= compress_config['avoidArea']]

							
							if not gdf.empty:

								if gdf['geometry'][0].geom_type == 'Polygon':
									coordinates_list = [list(gdf['geometry'].iloc[0].exterior.coords)]
								else:
									coordinates_list = [list(poly.exterior.coords) for poly in gdf['geometry'].iloc[0].geoms]

								
								new_coords.append(coordinates_list)

						coords = new_coords

				
				# Create Properties
					
				properties = [
					# str(fID),
					str(feature['id']),
					# feature['type'],
					str(geometry.index(feature['type'])),
					str(group_key),
					str(layer_key)
				]

				if 'name' in feature:
					properties.append(feature['name'])

				if 'center' in feature:
					properties.append(feature['center'])

				properties = '\t'.join(properties)
				target.write(properties)

				coords = json.dumps(coords, separators=(',', ':'))
				target.write('\t' + coords + '\n')

	return [1,1]

'''

	Test

'''

if __name__ == '__main__':
	CONFIG_NAME = 'canary'
	CONFIG_NAME = 'isle-of-dogs'
	# CONFIG_NAME = 'london'
	CONFIG = json.load(open('./configs/{}.json'.format(CONFIG_NAME), 'r'))

	compress_tiles(CONFIG)