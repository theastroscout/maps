/*

Clippers

*/

namespace surfy::geom {

	namespace clippers {

		/*

		Finds Intersection of two Segments

		*/

		bool segmentIntersection(const Point& p1, const Point& p2, const Point& p3, const Point& p4, Point& intersection) {
			double x1 = p1.x, y1 = p1.y;
			double x2 = p2.x, y2 = p2.y;
			double x3 = p3.x, y3 = p3.y;
			double x4 = p4.x, y4 = p4.y;

			double denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
			if (denom == 0) {
				return false; // Lines are parallel or coincident
			}

			double ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
			double ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

			if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
				intersection.x = x1 + ua * (x2 - x1);
				intersection.y = y1 + ua * (y2 - y1);
				return true; // Intersection exists within line segments
			}

			return false; // Intersection is outside the line segments
		}

		/*

		Clip Line by Mask

		*/

		Coords line(const Coords& line, const Coords& mask) {
			Coords clipped;
			size_t maskSize = mask.size();
			for (int i = 0, l = line.size(); i < l; ++i) {
				Point p = line[i];
				bool isInside = utils::inside(p, mask);

				if (isInside) {
					clipped.push_back(p);
				} else if (i > 0) {
					Point intersection;
					Point p1 = line[i];
					Point p2 = line[i - 1];

					for (int m=0, l = maskSize - 1; m < l; ++m) {
						Point p3 = mask[m];
						Point p4 = mask[m + 1];
						bool intersected = segmentIntersection(p1, p2, p3, p4, intersection);
						if (intersected) {
							clipped.push_back(intersection);
							break;
						}
					}

				}
			}
			
			return clipped;
		}

		/*


		
		Clipping Polygon by Mask
		Sutherland-Hodgman algorithm

		Mask Polygon should be sorted couterclockwise



		*/

		/*

		Coords polygon(const Coords& subjectPolygon, const Coords& clipPolygon) {
			Coords outputList = subjectPolygon;

			for (int i = 0; i < clipPolygon.size(); i++) {
				int k = (i + 1) % clipPolygon.size();
				Coords inputList = outputList;
				outputList.clear();

				Point S = clipPolygon[i];
				Point E = clipPolygon[k];

				for (int j = 0; j < inputList.size(); j++) {
					Point P = inputList[j];
					Point Q = inputList[(j + 1) % inputList.size()];

					double ix = P.x, iy = P.y, jx = Q.x, jy = Q.y;

					double p1 = (S.x - E.x) * (iy - S.y) - (S.y - E.y) * (ix - S.x);
					double p2 = (S.x - E.x) * (jy - S.y) - (S.y - E.y) * (jx - S.x);

					if (p1 >= 0 && p2 >= 0) {
						outputList.push_back(Q);
					} else if (p1 < 0 && p2 >= 0) {
						double x = ix + (jx - ix) * (S.y - iy) / (jy - iy);
						double y = S.y;
						outputList.push_back({x, y});
					} else if (p1 >= 0 && p2 < 0) {
						double x = ix + (jx - ix) * (S.y - iy) / (jy - iy);
						double y = S.y;
						outputList.push_back({x, y});
						outputList.push_back(Q);
					}
				}
			}

			return outputList;
		}

		Coords polygon2(const Coords& input, const Coords& mask) {

			Coords output = input;
			
			for (int i = 0; i < mask.size(); ++i) {
				Coords input = output;
				output.clear();
				
				const Point& a = mask[i];
				const Point& b = mask[(i + 1) % mask.size()];
				std::cout << a.x << ", " << a.y << std::endl;
				std::cout << b.x << ", " << b.y << std::endl;
				std::cout << "\n\n" << std::endl;

				for (int j = 0; j < input.size(); ++j) {
					const Point& p1 = input[j];
					const Point& p2 = input[(j + 1) % input.size()];

					double p1Side = (a.x - b.x) * (p1.y - a.y) - (a.y - b.y) * (p1.x - a.x);
					double p2Side = (a.x - b.x) * (p2.y - a.y) - (a.y - b.y) * (p2.x - a.x);

					// std::cout << "PushBack 1: " << p1Side << ", " << p2Side << std::endl;

					if (p1Side >= 0) {
						output.push_back(p1);
					}

					if (p1Side * p2Side < 0) {
						// std::cout << "PushBack 2" << std::endl;
						Point intersect;
						intersect.x = (p1.x * p2Side - p2.x * p1Side) / (p2Side - p1Side);
						intersect.y = (p1.y * p2Side - p2.y * p1Side) / (p2Side - p1Side);
						output.push_back(intersect);
					}
				}
			}

			return output;
		}

		double intersection(const Point& a, const Point& b, const Point& c) {
			return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
		}

		// Sutherland-Hodgman algorithm for polygon clipping
		Coords sutherlandHodgman(const Coords& subjectPolygon, const Coords& clipPolygon) {
			Coords output = subjectPolygon;
			for (size_t i = 0; i < clipPolygon.size(); ++i) {
				Coords input = output;
				output.clear();
				const size_t numVertices = input.size();
				const Point clipEdgeStart = clipPolygon[i];
				const Point clipEdgeEnd = clipPolygon[(i + 1) % clipPolygon.size()];
				for (size_t j = 0; j < numVertices; ++j) {
					const Point vertex1 = input[j];
					const Point vertex2 = input[(j + 1) % numVertices];
					if (intersection(clipEdgeStart, clipEdgeEnd, vertex2) >= 0) {
						if (intersection(clipEdgeStart, clipEdgeEnd, vertex1) < 0) {
							const double t = intersection(clipEdgeStart, clipEdgeEnd, vertex2) /
											  (intersection(clipEdgeStart, clipEdgeEnd, vertex2) -
											   intersection(clipEdgeStart, clipEdgeEnd, vertex1));
							output.push_back(Point{vertex2.x + t * (vertex1.x - vertex2.x),
												   vertex2.y + t * (vertex1.y - vertex2.y)});
						}
						output.push_back(vertex2);
					} else if (intersection(clipEdgeStart, clipEdgeEnd, vertex1) >= 0) {
						const double t = intersection(clipEdgeStart, clipEdgeEnd, vertex2) /
										  (intersection(clipEdgeStart, clipEdgeEnd, vertex2) -
										   intersection(clipEdgeStart, clipEdgeEnd, vertex1));
						output.push_back(Point{vertex2.x + t * (vertex1.x - vertex2.x),
											   vertex2.y + t * (vertex1.y - vertex2.y)});
					}
				}
			}
			return output;
		}

		*/

		Point intersect(Point s, Point e, Point cp1, Point cp2) {
			double A1 = e.y - s.y;
			double B1 = s.x - e.x;
			double C1 = A1 * s.x + B1 * s.y;

			double A2 = cp2.y - cp1.y;
			double B2 = cp1.x - cp2.x;
			double C2 = A2 * cp1.x + B2 * cp1.y;

			double det = A1 * B2 - A2 * B1;

			if (det == 0) {
				return {0, 0}; // Lines are parallel, no intersection
			}

			double x = (B2 * C1 - B1 * C2) / det;
			double y = (A1 * C2 - A2 * C1) / det;
			return {x, y};
		}

		bool inside(Point p, Point cp1, Point cp2) {
			return (cp2.x - cp1.x) * (p.y - cp1.y) >= (cp2.y - cp1.y) * (p.x - cp1.x);
		}

		Coords sutherlandHodgman(const Coords& subject, const Coords& clip) {
			Coords output = subject;

			for (size_t i = 0; i < clip.size(); ++i) {
				Coords input = output;
				output.clear();

				Point cp1 = clip[i];
				Point cp2 = clip[(i + 1) % clip.size()];

				for (size_t j = 0; j < input.size(); ++j) {
					Point s = input[j];
					Point e = input[(j + 1) % input.size()];

					if (inside(e, cp1, cp2)) {
						if (!inside(s, cp1, cp2)) {
							output.push_back(intersect(s, e, cp1, cp2));
						}
						output.push_back(e);
					} else if (inside(s, cp1, cp2)) {
						output.push_back(intersect(s, e, cp1, cp2));
					}
				}
			}

			return output;
		}



	}

	/*

	Clip

	*/

	void Shape::clip(const Coords& mask) {
		// Shape result;

		// std::vector<Point> mask = maskSrc.geom.polygon.outer.coords;

		if (type == "Point") {

			if (!utils::inside(geom.point, mask)) {
				type = "Dummy";
				new (&geom.point) types::Point();
			}

		} else if (type == "Line") {

			geom.line.coords = clippers::line(geom.line.coords, mask);

		} else if (type == "MultiLine") {

			for (int i = 0; i < size; ++i) {
				geom.multiLine.items[i].coords = clippers::line(geom.multiLine.items[i].coords, mask);
			}

		} else if (type == "Polygon") {

			if (!geom.polygon.outer.empty) {
				Coords coords = clippers::sutherlandHodgman(geom.polygon.outer.coords, mask);
				geom.polygon.outer.coords = coords;
			}

			if (!geom.polygon.inner.empty) {
				Coords coords = clippers::sutherlandHodgman(geom.polygon.inner.coords, mask);
				geom.polygon.inner.coords = coords;
			}

		} else if (type == "MultiPolygon") {

			for (int i = 0; i < size; ++i) {
				types::Polygon& poly = geom.multiPolygon.items[i];
				
				if (!poly.outer.empty) {
					Coords coords = clippers::sutherlandHodgman(poly.outer.coords, mask);
					poly.outer.coords = coords;
				}
				
				if (!poly.inner.empty) {
					Coords coords = clippers::sutherlandHodgman(poly.inner.coords, mask);
					poly.inner.coords = coords;
				}
			}

		}

		refresh();
	}
}