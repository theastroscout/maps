import os
import shutil
import json
import time

from utils.osm import OSM_handler
from tiles import create_tiles


class Parser:

	def __init__(self, config):
		self.config = config
		self.loadLayers()

	def loadLayers(self):
		self.layers = {}
		self.layers_list = self.config['layers'];
		for layer_name in self.layers_list:
			# Get Layer Config
			layer = json.load(open('./layers/{}.json'.format(layer_name), 'r'))

			# Fitting zoom

			for type_name, type_item in layer['filters'].items():
				for tag, filters in type_item.items():
					for filter_item in filters:
						if 'minzoom' not in filter_item:
							filter_item['minzoom'] = self.config['minzoom']
						if 'maxzoom' not in filter_item:
							filter_item['maxzoom'] = self.config['maxzoom']

			# Bind Layer Config
			self.layers[layer_name] = layer

	'''

		Go

	'''

	def go(self):

		# Initiate Osmium
		self.h = OSM_handler(self.config, self.layers)

		# Remove Temp File
		if os.path.exists(self.config['tmp_file']):
			os.remove(self.config['tmp_file'])

		# Start parsing
		# idx = 'dense_file_array,' + self.config['tmp_file']
		idx = 'sparse_file_array,' + self.config['tmp_file']
		self.h.apply_file(self.config['pbf_input'], locations=True, idx=idx)

		# Remove Temp File
		if os.path.exists(self.config['tmp_file']):
			os.remove(self.config['tmp_file'])

		'''

			Close Geo JSON Files

		'''

		for layer_name, layer in self.layers.items():
			if 'file' in layer:
				layer['file'].write('\n]}')
				layer['file'].close()

		# The End
		print('Completed for ', self.layers_list)

if __name__ == '__main__':

	CONFIG_NAME = 'canary'
	CONFIG_NAME = 'isle-of-dogs'
	CONFIG = json.load(open('./configs/{}.json'.format(CONFIG_NAME), 'r'))
	print(CONFIG)

	start_time = time.time()
	
	# Create GeoJSON Directory
	shutil.rmtree(CONFIG['geojson'], ignore_errors=True)
	os.makedirs(CONFIG['geojson'], exist_ok=True)

	print('Parse PBF...')
	parser = Parser(CONFIG)

	parser.go()

	print('Create Tiles...')
	create_tiles(CONFIG)

	end_time = time.time()
	print('Full Parse Completed in {}s'.format(round(end_time - start_time,3)))
