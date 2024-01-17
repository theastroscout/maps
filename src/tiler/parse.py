import os
import shutil
import json

from utils.osm import OSM_handler
from tiles import create_tiles

CONFIG_NAME = 'london'
CONFIG = json.load(open('./configs/{}.json'.format(CONFIG_NAME), 'r'))
print(CONFIG)

# Create GeoJSON Directory
shutil.rmtree(CONFIG['geojson'], ignore_errors=True)
os.makedirs(CONFIG['geojson'], exist_ok=True)

# Create Data Directory
shutil.rmtree(CONFIG['data'], ignore_errors=True)
os.makedirs(CONFIG['data'], exist_ok=True)


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

	print('Parse PBF...')
	parser = Parser(CONFIG)

	parser.go()

	print('Create Tiles...')
	create_tiles(CONFIG)
