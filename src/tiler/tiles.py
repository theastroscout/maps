'''

https://geopandas.org/en/stable/docs/reference/api/geopandas.GeoDataFrame.to_file.html
The write mode, ‘w’ to overwrite the existing file and ‘a’ to append.

'''

import os
os.environ['USE_PYGEOS'] = '0'
import json
import time
import shutil
import mercantile
import geopandas as gpd
import pandas as pd
from shapely.geometry import shape, box

import multiprocessing
num_cores = multiprocessing.cpu_count()

'''

	Make Tiles

'''

def tiles(geojson_file, tiles_dir):
	global num_cores
	df = gpd.read_file(geojson_file, driver='GeoJSON')
	min_lng, min_lat, max_lng, max_lat = df.geometry.total_bounds

	# print('Bounding box', min_lng, min_lat, max_lng, max_lat)
	
	bunch = []
	for zoom in (2, 4, 6, 8, 10, 12, 14):
		
		print('Parsing zoom {}'.format(zoom))
		for tile in mercantile.tiles(min_lng, min_lat, max_lng, max_lat, zooms=zoom, truncate=False):

			output_dir = os.path.join(tiles_dir, str(tile.z), str(tile.x))
			output_file = os.path.join(output_dir, f'{tile.y}.geojson')
			
			bunch.append([df,tile,zoom,tiles_dir])

	# Run Bunch
	if len(bunch):
		with multiprocessing.Pool(processes=num_cores) as pool:
			pool.map(make_tile, bunch)

'''

	Make Tile

'''

def make_tile(data):
	[df, tile, zoom, tiles_dir] = data
	
	south, west, north, east = mercantile.bounds(tile)

	tile_bbox = box(south, west, north, east)
	
	df_temp = df.copy()

	# Zoom filter
	df_temp = df_temp[(zoom >= df_temp['minzoom']) & (zoom <= df_temp['maxzoom'])]
	if df_temp.empty:
		return False # Skip if tile is empty
	
	# Intersects Filter
	# df_temp = df_temp[df_temp.geometry.intersects(tile_bbox)]
	df_temp = gpd.clip(df_temp, tile_bbox)
	if df_temp.empty:
		return False # Skip if tile is empty

	# Make Directory
	output_dir = os.path.join(tiles_dir, str(tile.z), str(tile.x))
	output_file = os.path.join(output_dir, f'{tile.y}.geojson')
	os.makedirs(output_dir, exist_ok=True)


	if os.path.exists(output_file):
		# Merge
		existed_df = gpd.read_file(output_file, driver='GeoJSON')
		merged_df = pd.concat([existed_df, df_temp])
		merged_df.to_file(output_file, driver='GeoJSON', mode='w')
	else:
		# Create new one
		df_temp.to_file(output_file, driver='GeoJSON', mode='w')

	return True

'''

Create Tiles

'''

def create_tiles(CONFIG):
	global tiles

	start_time = time.time()

	# Create Data Directory
	shutil.rmtree(CONFIG['data'], ignore_errors=True)
	os.makedirs(CONFIG['data'], exist_ok=True)

	for f in os.listdir(CONFIG['geojson']):
		path = os.path.join(CONFIG['geojson'], f)
		if os.path.isfile(path):			
			print('Creating Tiles from {}'.format(path))
			tiles(path, CONFIG['data'])

	end_time = time.time()
	print('Tiles created in {}s'.format(round(end_time - start_time,3)))


if __name__ == '__main__':

	# CONFIG_NAME = 'canary'
	# CONFIG_NAME = 'isle-of-dogs'
	CONFIG_NAME = 'london'
	CONFIG = json.load(open('./configs/{}.json'.format(CONFIG_NAME), 'r'))
	print('Config: {}'.format(CONFIG_NAME))

	create_tiles(CONFIG)
