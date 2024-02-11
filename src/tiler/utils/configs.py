'''

Get Config

'''

def getConfig(self, o, type_name):
	
	filters = self.config['filters'][type_name]
	
	for tag_name in filters:
		if tag_name not in o.tags:
			continue

		# print(tag_name)
		value = o.tags.get(tag_name)

		for match in filters[tag_name]:
			if match['values'] != '*' and value not in match['values']:
				continue

			return {
				'containers': match['containers']
			}

		
		# print(tag['values'])
		# if value not in tag['values']:
		#	continue

		# print(o)
		

	return False