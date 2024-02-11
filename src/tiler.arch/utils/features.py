import json

'''

Add Features

'''

def addFeature(self, o, spec, coords):

	# Create a File Object
	if 'file_path' not in spec['config']:
		if 'batch_num' not in spec['config']:
			spec['config']['batch_num'] = 0

		spec['config']['batch_num'] = spec['config']['batch_num'] + 1

		file_path = '{}/{}.{}.geojson'.format(self.config['geojson'], spec['config']['name'], spec['config']['batch_num'])
		
		spec['config']['file_path'] = file_path
		spec['config']['features_amount'] = 0

		'''

			Create File Stream

		'''

		file = open(file_path, 'w', encoding='utf8')
		header = json.dumps(spec['config']['obj'], ensure_ascii=False)
		header = header.replace(']}', '')
		file.write(header)
		spec['config']['file'] = file
		spec['config']['delimiter'] = '\n'

	# Count Features
	spec['config']['features_amount'] = spec['config']['features_amount'] + 1

	'''

		Fix Coords

	'''

	if isinstance(coords, list):
		coords = {
			'type': 'Point',
			'coordinates': coords
		}
	else:
		coords = self.mapping(coords)
	
	'''

		Create Feature Object

	'''

	feature = {
		'type': 'Feature',
		'geometry': coords,
		'properties': spec['properties']
	}

	# if 'name' in spec['properties'] and spec['properties']['name'] == 'Credit Suisse':
	#	print(feature)

	# print(feature)

	feature = spec['config']['delimiter'] + json.dumps(feature, ensure_ascii=False)
	spec['config']['file'].write(feature)

	if spec['config']['delimiter'] == '\n':
		spec['config']['delimiter'] = ',\n'

	return True
	