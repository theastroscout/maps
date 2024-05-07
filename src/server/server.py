'''

Request /tiles/{src}
Storage /tiles/{src}/data/../../..

'''

import sys, argparse, socket, json
from _thread import *

parser = argparse.ArgumentParser(description='Surfy° Maps. Simple Server')
parser.add_argument('-H', '--host', type=str, help='Host (default 127.0.0.1)', required=False)
parser.add_argument('-p', '--port', type=int, help='Port number (Required)', required=True)
parser.add_argument('-m', '--max', type=int, help='Max Request Size (deafult 4096)', required=False)
parser.add_argument('-t', '--tiles', type=str, help='Path to Tiles storage (e.g. /storage/tiles)', required=True)
args = parser.parse_args()

HOST = args.host or '127.0.0.1'  # Localhost
PORT = args.port
TILES = args.tiles
MAX_REQUEST_SIZE = args.max or 4096
BUFF_SIZE = 1024

class NpEncoder(json.JSONEncoder):
	def default(self, obj):
		if isinstance(obj, np.bool_):
			return bool(obj)
		if isinstance(obj, np.integer):
			return int(obj)
		if isinstance(obj, np.floating):
			return float(obj)
		if isinstance(obj, np.ndarray):
			return obj.tolist()
		return json.JSONEncoder.default(self, obj)

def go():
	# Create socket
	server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
	server_socket.bind((HOST, PORT))
	server_socket.listen(1)
	print(f'Surfy°Maps.Simple Server\r\nListening carefully... {HOST}:{PORT}')

	while True:    
		# Waiting for client connection
		client_connection, client_address = server_socket.accept()

		start_new_thread(threaded_client, (client_connection, ))

	# Close socket
	server_socket.close()

def threaded_client(client_connection):
	
	# Get the client request

	request = b''  # Initialize an empty byte string to store the request
	while True:
		chunk = client_connection.recv(BUFF_SIZE)
		if not chunk:
			break

		request += chunk

		if len(chunk) < BUFF_SIZE:
			break

		if len(request) >= MAX_REQUEST_SIZE:
			break

	request = request.decode()  # Decode the complete request

	headers = request.split('\r\n')
	method, url, _ = headers[0].split(' ')
	
	# Get Payload
	payload = json.loads(headers[len(headers)-1])

	# Get Result
	output = {'status': False, 'msg': 'Method is not found'}
	if payload['method'] == 'bulk':
		del output['msg']
		output['status'] = True

		src = url.split('/')[2]
		
		data = {}
		for url in payload['urls']:
			try:
				with open(TILES + '/' + src + '/data/' + url, 'r') as file:
					content = file.read()
					data[url] = content
			except:
				data[url] = '0'
		output['data'] = data

	# Send Response
	result = json.dumps(output, cls=NpEncoder)
	content_length = len(result)
	response = f'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {content_length}\r\n\r\n'+result
	client_connection.sendall(response.encode())
	client_connection.close()

if __name__ == "__main__":
	go()