import json

'''

Add Features

'''

def addFeature(self, o, spec, coords):

	# Create a File Object
	if 'file_path' not in spec['layer']:
		if 'batch_num' not in spec['layer']:
			spec['layer']['batch_num'] = 0

		spec['layer']['batch_num'] = spec['layer']['batch_num'] + 1

		file_path = '{}/{}.{}.geojson'.format(self.config['geojson'], spec['layer']['name'], spec['layer']['batch_num'])
		# print('Create JSON', file_path)
		spec['layer']['file_path'] = file_path
		spec['layer']['features_amount'] = 0

		'''

			Create File Stream

		'''

		file = open(file_path, 'w', encoding='utf8')
		header = json.dumps(spec['layer']['obj'], ensure_ascii=False)
		header = header.replace(']}', '')
		file.write(header)
		spec['layer']['file'] = file
		spec['layer']['delimiter'] = '\n'

	# Count Features
	spec['layer']['features_amount'] = spec['layer']['features_amount'] + 1

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

	feature = spec['layer']['delimiter'] + json.dumps(feature, ensure_ascii=False)
	spec['layer']['file'].write(feature)

	if spec['layer']['delimiter'] == '\n':
		spec['layer']['delimiter'] = ',\n'

	return True
	