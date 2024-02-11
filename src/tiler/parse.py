'''

Convert PBF file into tiles

'''

import os
import json
from utils.osm import OSM_handler

class Parse:

	def __init__(self, config):
		self.config = config

	def go(self,):
		self.h = OSM_handler(self.config)

		# Remove Temp File
		if os.path.exists(self.config['tmp_file']):
			os.remove(self.config['tmp_file'])

		# Remove DB
		if os.path.exists(self.config['db_file']):
			os.remove(self.config['db_file'])

		# Start parsing
		# idx = 'dense_file_array,' + self.config['tmp_file']
		idx = 'sparse_file_array,' + self.config['tmp_file']
		self.h.apply_file(self.config['pbf_input'], locations=True, idx=idx)

		# Remove Temp File
		if os.path.exists(self.config['tmp_file']):
			os.remove(self.config['tmp_file'])


if __name__ == '__main__':
	config_name = 'canary'
	
	settings = json.load(open('./configs/{}.json'.format(config_name), 'r'))

	filters = json.load(open('./config.json'))

	CONFIG = {**settings, **filters}

	# print(CONFIG)

	parse = Parse(CONFIG)
	parse.go()
	print('Complete')