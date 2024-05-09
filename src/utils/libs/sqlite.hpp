#ifndef SURFY_SQLITE_HPP
#define SURFY_SQLITE_HPP

#include <sqlite3.h>
#include <iostream>

namespace surfy {

	class SQLiteDB {
		sqlite3* db;

	public:
		SQLiteDB(const char* dbName) {
			int rc = sqlite3_open(dbName, &db);
			if (rc) {
				std::cerr << "Can't open database: " << sqlite3_errmsg(db) << std::endl;
				sqlite3_close(db);
			}
		}

		~SQLiteDB() {
			sqlite3_close(db);
		}

		bool query(const char* query, void(*callback)(), std::vector<char*> = {}) {
			
			int rc = sqlite3_exec(db, query, callback, nullptr, nullptr);
			if (rc != SQLITE_OK) {
				std::cerr << "SQL error: " << errorMessage << std::endl;
				sqlite3_free(errorMessage);
				return false;
			}
			return true;
		}
	};
}

#endif