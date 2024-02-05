'''

Convert PBF file into tiles

'''

import os
import shutil
import json
import time

from utils.osm import OSM_handler
from tiles import create_tiles
from compress import compress_tiles

class Parser:

	def __init__(self, config):
		self.config = config
		self.load_configs()

	'''

		Load Groups and Configs

	'''

	def load_configs(self):
		
		self.groups = {}

		for group_name in reversed(self.config['groups']):
			print(group_name)
			
			# Get Group Config
			group_config = json.load(open('./groups/{}.json'.format(group_name), 'r'))

			# Fitting zoom

			for type_name, type_item in group_config['filters'].items():
				for tag, filters in reversed(type_item.items()):
					for filter_item in filters:
						if 'minzoom' not in filter_item:
							filter_item['minzoom'] = self.config['minzoom']
						if 'maxzoom' not in filter_item:
							filter_item['maxzoom'] = self.config['maxzoom']

			# Bind Config
			self.groups[group_name] = {
				'config': group_config,
				'compress': self.config['groups'][group_name]
			}

		return True

	'''

		Go

	'''

	def go(self):

		# Initiate Osmium
		self.h = OSM_handler(self.config, self.groups)

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

		for group_name, group in self.groups.items():
			if 'file' in group['config']:
				group['config']['file'].write('\n]}')
				group['config']['file'].close()

		return True

'''

	Launch

'''

if __name__ == '__main__':

	CONFIG_NAME = 'canary'
	# CONFIG_NAME = 'isle-of-dogs'
	# CONFIG_NAME = 'london'
	CONFIG = json.load(open('./configs/{}.json'.format(CONFIG_NAME), 'r'))
	print('Config: {}'.format(CONFIG_NAME))

	start_time = time.time()
	
	# Create GeoJSON Directory to store parsed features
	shutil.rmtree(CONFIG['geojson'], ignore_errors=True)
	os.makedirs(CONFIG['geojson'], exist_ok=True)

	print('Parsing PBF...')
	parser = Parser(CONFIG)

	parser.go()

	print('Creating Tiles...')
	create_tiles(CONFIG)

	print('Compressing Data...')
	compress_tiles(CONFIG)

	end_time = time.time()
	print('Full Parse Completed in {}s'.format(round(end_time - start_time,3)))
