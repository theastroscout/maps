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
geometries = ['Point','LineString','MultiLineString','Polygon','MultiPolygon']

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

def fit_coords(coords):
	# return [' '.join(map(str, [round(lon * 1000000), round(lat * 1000000)])) for lon, lat in coords]
	return [(round(lon * 1000000), round(lat * 1000000)) for lon, lat in coords]

'''

	Compress Tiles

'''

def compress_tiles(CONFIG):

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
				bunch.append([tile[0], CONFIG])

	'''

	Processing Data

	'''
	if len(bunch):
		num_cores = multiprocessing.cpu_count()
		#for b in bunch:
		#	compress(b)
		with multiprocessing.Pool(processes=num_cores) as pool:
			pool.map(compress, bunch)

	'''

	Output Statistics

	'''

	end_time = time.time()
	print('Tiles compressed in {}s'.format(round(end_time - start_time,3)))

'''

	Compress and Formating Tile Data

'''

def compress(data):
	
	# Get Input Params
	[tile, CONFIG] = data

	# Extract Tile Features
	z,x,y = tile

	print('Compressing {}'.format(tile))

	z = str(z)
	features = {}

	for group_name, group in CONFIG['groups'].items():
		features[group_name] = {}

	'''

	Parse Geo JSON

	'''

	# Load Geo JSON
	geojson = CONFIG['data'] + '/{}/{}/{}.geojson'.format(z,x,y)
	data = json.load(open(geojson, 'r'))

	'''

		Parse Features

	'''

	for feature in data['features']:
		
		geom_type = feature['geometry']['type']
		group_name = feature['properties']['group']

		if group_name == 'bridges':
			fID = feature['properties']['id']
		elif group_name == 'roads' and 'name' in feature['properties']:
			
			'''

				Assume that feature id is a name if feature's type is road
				It's ok as we talk about one tile only

			'''

			fID = feature['properties']['name']
		else:
			fID = feature['properties']['id']

		'''

			Create Feature if not exists

		'''

		if fID not in features[group_name]:
			features[group_name][fID] = {
				'type': geom_type,
				'id': feature['properties']['id'],
				'group': group_name,
				'coords': []
			}

			# Set Layer Name
			if 'layer' in feature['properties'] and feature['properties']['layer']:
				layer = CONFIG['groups'][group_name]['layers'].index(feature['properties']['layer'])
				features[group_name][fID]['layer'] = str(layer)

			# Set Class
			if 'class' in feature['properties'] and feature['properties']['class']:
				features[group_name][fID]['class'] = feature['properties']['class']

			# Set Name
			if 'name' in feature['properties'] and feature['properties']['name']:
				features[group_name][fID]['name'] = feature['properties']['name']

			# Set Center Coordinates
			if 'center' in feature['properties'] and feature['properties']['center']:
				features[group_name][fID]['center'] = feature['properties']['center']

		featureItem = features[group_name][fID]

		feature_is_line = bool(re.search(r'Line', geom_type))
		feature_item_is_line = bool(re.search(r'Line', featureItem['type']))

		# Merge Coordinates for the Same Feature ID
		if geom_type in ['LineString', 'MultiLineString']:
			
			featureItem['type'] = 'MultiLineString'

			coords = feature['geometry']['coordinates']

			if geom_type == 'LineString':
				coords = [coords]
			featureItem['coords'] = featureItem['coords'] + coords

		elif geom_type == 'Polygon':
			featureItem['type'] = 'MultiPolygon'
			featureItem['coords'] = featureItem['coords'] + [feature['geometry']['coordinates']]

		elif geom_type == 'MultiPolygon':
			featureItem['coords'] = featureItem['coords'] + feature['geometry']['coordinates']




	'''

		Write Features to the target file

	'''

	output = CONFIG['data'] + '/{}/{}/{}'.format(z,x,y)
	target_file = open(output, 'w')

	# We need to store group_key instead of group name

	for group_key, group_name in enumerate(features):
		# print(group_key, group_name)
		group = features[group_name]

		for fID, feature in group.items():

			'''

			Process Coordinates

			'''

			coords = feature['coords']

			# Get Compress Configuration

			compress_config = False
			if 'compress' in CONFIG['groups'][group_name] and z in CONFIG['groups'][group_name]['compress']:
				compress_config = CONFIG['groups'][group_name]['compress'][z]

			# print(compress_config)

			if feature['type'] == 'MultiLineString':
				coords = [LineString(c) for c in coords]
				coords = linemerge(coords)

				if compress_config and 'tolerance' in compress_config:
					if coords.geom_type == 'LineString':
						feature['type'] = 'LineString'

						# Simplify Line String
						simplified_line = coords.simplify(compress_config['tolerance'])
						coords = list(simplified_line.coords)
						coords = fit_coords(coords)

					else:
						
						# Simplify MultiLine String

						new_coords = []
						for line in coords.geoms:
							simplified_line = line.simplify(compress_config['tolerance'])
							c = fit_coords(list(simplified_line.coords))
							new_coords.append(c)

						coords = new_coords;
					
				elif coords.geom_type == 'LineString':
					coords = fit_coords(list(coords.coords))
				else:
					new_coords = []
					for line in coords.geoms:
						c = fit_coords(list(line.coords))
						new_coords.append(c)

					coords = new_coords;


			elif feature['type'] == 'MultiPolygon':
				new_coords = []

				for multy_polygon in coords:

					multipolygon = MultiPolygon([Polygon(c) for c in multy_polygon])

					gdf = gpd.GeoDataFrame(geometry=[multipolygon])

					if compress_config:

						if 'tolerance' in compress_config:
							gdf['geometry'] = gdf.simplify(tolerance=compress_config['tolerance'], preserve_topology=True)

						if not gdf.empty and 'avoidArea' in compress_config:
							gdf = gdf[gdf['geometry'].area >= compress_config['avoidArea']]
					
					if not gdf.empty:

						if gdf['geometry'][0].geom_type == 'Polygon':
							feature['type'] = 'Polygon'
							coordinates_list = fit_coords(list(gdf['geometry'].iloc[0].exterior.coords))
						else:
							coordinates_list = [fit_coords(list(poly.exterior.coords)) for poly in gdf['geometry'].iloc[0].geoms]

						new_coords.append(coordinates_list)

				coords = new_coords



			'''

				Create Feature

			'''

			if not len(coords):
				continue
				
			properties = [
				str(feature['id']),
				str(geometries.index(feature['type'])),
				str(group_key)
			]

			if 'layer' in feature:
				properties.append(feature['layer'])

			if 'name' in feature:
				properties.append(feature['name'])

			# if 'center' in feature:
			#	properties.append(feature['center'])

			properties = '\t'.join(properties)
			target_file.write(properties)

			# print(coords)
			coords = json.dumps(coords, separators=(',', ':'))
			target_file.write('\t' + coords + '\n')

	# print('')



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
	'''

	return True

'''

	Test

'''

if __name__ == '__main__':
	CONFIG_NAME = 'canary'
	# CONFIG_NAME = 'isle-of-dogs'
	# CONFIG_NAME = 'london'
	CONFIG = json.load(open('./configs/{}.json'.format(CONFIG_NAME), 'r'))

	compress_tiles(CONFIG)