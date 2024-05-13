
namespace surfy::geom3 {
	
	class Shape {
	public:
		std::string type;
		std::string source;

		union Geometry {
			Point point;
			Line line;
			MultiLine multiline;
			Polygon polygon;
			MultiPolygon multiPolygon;

			Geometry(){}
			~Geometry(){}

		} geom;

		/*

		WKT
		Stringify geometry, e.g. POINT (1 2) or LINESTRING (0 0, 2 2)

		*/

		std::string wkt() {
			std::stringstream os;		

			if (type == "Point") {

				os << "POINT (";
				utils::printPoint(os, geom.point);
				os << ")";

			} else if (type == "Line") {

				os << "LINESTRING (";
				utils::printCoords(os, geom.line.coords);
				os << ")";
			}

			return os.str();
		}
		

		Shape (const std::string& src) {
			source = src; // Store source just in case

			// Find the start and end positions of the coordinates substring
			size_t startPos = src.find("(");
			size_t endPos = src.rfind(")");
			std::string body = src.substr(startPos + 1, endPos - startPos - 1);

			if (startPos == std::string::npos || endPos == std::string::npos) {
				type = "Error";
				return;
			}

			if (src.find("POINT") != std::string::npos) {
				
				type = "Point";
				new (&geom.point) Point();
				std::vector<Point> coords = utils::parseCoordsString(body);
				geom.point = coords[0];

			} else if (src.find("LINE") != std::string::npos) {

				type = "Line";
				new (&geom.line) Line();
				geom.line.coords = utils::parseCoordsString(body);

			} else if (src.find("POLYGON") != std::string::npos) {

				type = "Polygon";
				// geom.polygon = Polygon();
				new (&geom.polygon) Polygon();

				std::cout << "Polygon Body" << body << std::endl;

				int pass = 1;
				size_t pos = 0;
				while (pos < body.size()) {
					size_t start = body.find("(", pos);
					size_t end = body.find(")", start);
					if (start == std::string::npos || end == std::string::npos) {
						break; // No more polygons found
					}

					std::cout << "Cutting Body" << std::endl;
					std::string polyStr = body.substr(start + 1, end - start - 1);

					std::cout << "Set Post: " << pos << " >> " << end + 1 << ", Body Size: " << body.size() << std::endl;
					pos = end + 1;

					std::cout << "Parse Coords: " << polyStr << std::endl;
					std::vector<Point> coords = utils::parseCoordsString(polyStr);

					if (pass == 1) {
						std::cout << "Set Outer: " << coords.size() << std::endl;
						geom.polygon.outer = coords;
					} else {
						std::cout << "??????" << std::endl;
						geom.polygon.inner = coords;
					}

					pass++;
				}


				std::cout << "Refresh Polygon, PASS: " << pass << std::endl;
				
				utils::refreshPolygon(geom.polygon);

				std::cout << "Assigning new poly" << std::endl;
				// geom.polygon = poly;


			} else {

				type = "Error";
			}

			std::cout << "DONE" << std::endl;
		}
		~Shape() {
			std::cout << "KILL!!!" << std::endl;
		}
	};

}