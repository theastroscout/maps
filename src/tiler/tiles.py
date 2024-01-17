'''

https://geopandas.org/en/stable/docs/reference/api/geopandas.GeoDataFrame.to_file.html
The write mode, ‘w’ to overwrite the existing file and ‘a’ to append.

'''

import os
os.environ['USE_PYGEOS'] = '0'
import shutil
import mercantile
import geopandas as gpd
import pandas as pd
from shapely.geometry import shape, box
from utils.compress import compress

INIT = True
LAYERS = ['roads', 'buildings', 'greens', 'water']
tiles = []

def parse_layer(geojson_file, tiles_dir):
	global INIT
	global tiles
	df = gpd.read_file(geojson_file, driver='GeoJSON')
	min_lng, min_lat, max_lng, max_lat = df.geometry.total_bounds

	# print('Bounding box', min_lng, min_lat, max_lng, max_lat)
	
	for zoom in (2, 4, 6, 8, 10, 12, 14):
		for tile in mercantile.tiles(min_lng, min_lat, max_lng, max_lat, zooms=zoom, truncate=False):
			# print(tile)
			south, west, north, east = mercantile.bounds(tile)

			tile_bbox = box(south, west, north, east)
			
			df_temp = df.copy()
			
			df_temp = df_temp[df_temp.geometry.intersects(tile_bbox)]
			
			if df_temp.empty: continue # Skip if tile is empty

			df_temp.geometry = df_temp.geometry.intersection(tile_bbox) # , align=False

			# Zoom filter
			df_temp = df_temp[(zoom >= df_temp['minzoom']) & (zoom <= df_temp['maxzoom'])]
			if df_temp.empty: continue # Skip if tile is empty

			# Simplification
			# c = len(df_temp.geometry.get_coordinates())
			# df_temp = df_temp.simplify(tolerance=0.00001, preserve_topology=True)
			# nc = len(df_temp.geometry.get_coordinates())
			# print(c, nc, nc / c * 100)

			# Make Directory
			output_dir = os.path.join(tiles_dir, str(tile.z), str(tile.x))
			output_file = os.path.join(output_dir, f'{tile.y}.geojson')
			os.makedirs(output_dir, exist_ok=True)

			df_temp = df_temp.round(3)

			if INIT:
				mode = 'w'
			elif os.path.exists(output_file):
				mode = 'a'
			else:
				mode = 'w'

			if mode == 'a':
				existed_df = gpd.read_file(output_file, driver='GeoJSON')
				merged_df = pd.concat([existed_df, df_temp])
				merged_df.to_file(output_file, driver='GeoJSON', mode='w')
			else:
				df_temp.to_file(output_file, driver='GeoJSON', mode=mode)
				tiles.append([tile.z, tile.x, tile.y])

			# print('Output:', mode, output_file)


def create_tiles(geojson_dir, tiles_dir):
	global INIT
	global tiles
	# Remove Tiles to Recreate
	shutil.rmtree(tiles_dir, ignore_errors=True)

	for f in os.listdir(geojson_dir):
		path = os.path.join(geojson_dir, f)
		if os.path.isfile(path):
			if INIT:
				INIT = False
			
			print('Parse:', path)
			parse_layer(path, tiles_dir)

	print('Compressing...')
	for tile in tiles:
		z,x,y = tile
		geojson = '/storage/maps/tmp/tiles/{}/{}/{}.geojson'.format(z,x,y)
		output = '/storage/maps/tmp/tiles/{}/{}/{}'.format(z,x,y)
		compress(geojson, output)

	print('Complete')

if __name__ == '__main__':
	create_tiles('/storage/maps/tmp/geojson', '/storage/maps/tmp/tiles')