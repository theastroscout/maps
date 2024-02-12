import sqlite3
import json
import geopandas as gpd

def create_tiles():
	return True

if __name__ == '__main__':
	config_name = 'canary'
	
	settings = json.load(open('./configs/{}.json'.format(config_name), 'r'))

	filters = json.load(open('./config.json'))

	CONFIG = {**settings, **filters}

	create_tiles(CONFIG)