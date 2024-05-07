// g++ -o address address.cpp --std=c++11 -lpthread -lz -lexpat -lbz2

#include <iostream>

#include <osmium/handler.hpp>
#include <osmium/area/assembler.hpp>
#include <osmium/io/any_input.hpp>
#include <osmium/osm/node.hpp>
#include <osmium/osm/way.hpp>
#include <osmium/visitor.hpp>

class MyHandler : public osmium::handler::Handler {
public:
	void node(const osmium::Node& node) {
		// std::cout << "node " << node.id() << '\n';
	}
	void way(const osmium::Way& node) {
		std::cout << "way " << node.id() << '\n';
	}
};

int main() {
	auto otypes = osmium::osm_entity_bits::node | osmium::osm_entity_bits::way;
	osmium::io::Reader reader{"/storage/maps/tiles/london/src.pbf", otypes};
	MyHandler handler;
	osmium::apply(reader, handler);
	reader.close();
}