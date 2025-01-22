/*
 Navicat Premium Dump SQL

 Source Server         : 1
 Source Server Type    : MySQL
 Source Server Version : 90001 (9.0.1)
 Source Host           : localhost:3306
 Source Schema         : system

 Target Server Type    : MySQL
 Target Server Version : 90001 (9.0.1)
 File Encoding         : 65001

 Date: 20/11/2024 00:05:52
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for system
-- ----------------------------
DROP TABLE IF EXISTS `system`;
CREATE TABLE `system`  (
  `config_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `config_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of system
-- ----------------------------
INSERT INTO `system` VALUES ('stock_list', '300001,300002,300003,300004,300005,300006,300007,300008,300009,300010,300011,300012,300013,300014,300015,300016,300017,300018,300019,300020,300021,300022,300023,300024,300025,300026,300027,300028,300029,300030,300031,300032,300033,300034,300035,300036,300037,300038,300039,300040,300041,300042,300043,300044,300045,300046,300047,300048,300049,300050,300051,300052,300053,300054,300055,300056,300057,300058,300059,300061,300062,300063,300064,300065,300066,300067,300068,300069,300070,300071,300072,300073,300074,300075,300076,300077,300078,300079,300080,300081,300082,300083,300084,300085,300086,300087,300088,300089,300090,300091,300092,300093,300094,300095,300096,300097,300098,300099,300100');
INSERT INTO `system` VALUES ('core_china_table', 'chinalist');
INSERT INTO `system` VALUES ('china_db_name', 'china_history_stocks_data');
INSERT INTO `system` VALUES ('user_db', 'user');
INSERT INTO `system` VALUES ('user_select_db', 'select');
INSERT INTO `system` VALUES ('core_db', 'core');
INSERT INTO `system` VALUES ('factor_table', 'factor');
INSERT INTO `system` VALUES ('factor_db', 'factor');
INSERT INTO `system` VALUES ('baseData_db', 'baseData');
INSERT INTO `system` VALUES ('factor_import_files_db', 'factor_import_files');
INSERT INTO `system` VALUES ('strategy_db', 'strategy');
INSERT INTO `system` VALUES ('strategy_table', 'strategy');
INSERT INTO `system` VALUES ('backtest_table', 'backtest');
INSERT INTO `system` VALUES ('backtest_db', 'backtest_buysell');
INSERT INTO `system` VALUES ('self_stocks_table', 'select');
INSERT INTO `system` VALUES ('headers_table', 'headers');
INSERT INTO `system` VALUES ('stock_list', '300001,300002,300003,300004,300005,300006,300007,300008,300009,300010,300011,300012,300013,300014,300015,300016,300017,300018,300019,300020,300021,300022,300023,300024,300025,300026,300027,300028,300029,300030,300031,300032,300033,300034,300035,300036,300037,300038,300039,300040,300041,300042,300043,300044,300045,300046,300047,300048,300049,300050,300051,300052,300053,300054,300055,300056,300057,300058,300059,300061,300062,300063,300064,300065,300066,300067,300068,300069,300070,300071,300072,300073,300074,300075,300076,300077,300078,300079,300080,300081,300082,300083,300084,300085,300086,300087,300088,300089,300090,300091,300092,300093,300094,300095,300096,300097,300098,300099,300100');
INSERT INTO `system` VALUES ('core_china_table', 'chinalist');
INSERT INTO `system` VALUES ('china_db_name', 'china_history_stocks_data');
INSERT INTO `system` VALUES ('user_db', 'user');
INSERT INTO `system` VALUES ('user_select_db', 'select');
INSERT INTO `system` VALUES ('core_db', 'core');
INSERT INTO `system` VALUES ('factor_table', 'factor');
INSERT INTO `system` VALUES ('factor_db', 'factor');
INSERT INTO `system` VALUES ('baseData_db', 'baseData');
INSERT INTO `system` VALUES ('factor_import_files_db', 'factor_import_files');
INSERT INTO `system` VALUES ('strategy_db', 'strategy');
INSERT INTO `system` VALUES ('strategy_table', 'strategy');
INSERT INTO `system` VALUES ('backtest_table', 'backtest');
INSERT INTO `system` VALUES ('backtest_db', 'backtest_buysell');
INSERT INTO `system` VALUES ('self_stocks_table', 'select');
INSERT INTO `system` VALUES ('headers_table', 'headers');
INSERT INTO `system` VALUES ('stock_list', '300001,300002,300003,300004,300005,300006,300007,300008,300009,300010,300011,300012,300013,300014,300015,300016,300017,300018,300019,300020,300021,300022,300023,300024,300025,300026,300027,300028,300029,300030,300031,300032,300033,300034,300035,300036,300037,300038,300039,300040,300041,300042,300043,300044,300045,300046,300047,300048,300049,300050,300051,300052,300053,300054,300055,300056,300057,300058,300059,300061,300062,300063,300064,300065,300066,300067,300068,300069,300070,300071,300072,300073,300074,300075,300076,300077,300078,300079,300080,300081,300082,300083,300084,300085,300086,300087,300088,300089,300090,300091,300092,300093,300094,300095,300096,300097,300098,300099,300100');
INSERT INTO `system` VALUES ('core_china_table', 'chinalist');
INSERT INTO `system` VALUES ('china_db_name', 'china_history_stocks_data');
INSERT INTO `system` VALUES ('user_db', 'user');
INSERT INTO `system` VALUES ('user_select_db', 'select');
INSERT INTO `system` VALUES ('core_db', 'core');
INSERT INTO `system` VALUES ('factor_table', 'factor');
INSERT INTO `system` VALUES ('factor_db', 'factor');
INSERT INTO `system` VALUES ('baseData_db', 'baseData');
INSERT INTO `system` VALUES ('factor_import_files_db', 'factor_import_files');
INSERT INTO `system` VALUES ('strategy_db', 'strategy');
INSERT INTO `system` VALUES ('strategy_table', 'strategy');
INSERT INTO `system` VALUES ('backtest_table', 'backtest');
INSERT INTO `system` VALUES ('backtest_db', 'backtest_buysell');
INSERT INTO `system` VALUES ('self_stocks_table', 'select');
INSERT INTO `system` VALUES ('headers_table', 'headers');
INSERT INTO `system` VALUES ('stock_list', '300001,300002,300003,300004,300005,300006,300007,300008,300009,300010,300011,300012,300013,300014,300015,300016,300017,300018,300019,300020,300021,300022,300023,300024,300025,300026,300027,300028,300029,300030,300031,300032,300033,300034,300035,300036,300037,300038,300039,300040,300041,300042,300043,300044,300045,300046,300047,300048,300049,300050,300051,300052,300053,300054,300055,300056,300057,300058,300059,300061,300062,300063,300064,300065,300066,300067,300068,300069,300070,300071,300072,300073,300074,300075,300076,300077,300078,300079,300080,300081,300082,300083,300084,300085,300086,300087,300088,300089,300090,300091,300092,300093,300094,300095,300096,300097,300098,300099,300100');
INSERT INTO `system` VALUES ('core_china_table', 'chinalist');
INSERT INTO `system` VALUES ('china_db_name', 'china_history_stocks_data');
INSERT INTO `system` VALUES ('user_db', 'user');
INSERT INTO `system` VALUES ('user_select_db', 'select');
INSERT INTO `system` VALUES ('core_db', 'core');
INSERT INTO `system` VALUES ('factor_table', 'factor');
INSERT INTO `system` VALUES ('factor_db', 'factor');
INSERT INTO `system` VALUES ('baseData_db', 'baseData');
INSERT INTO `system` VALUES ('factor_import_files_db', 'factor_import_files');
INSERT INTO `system` VALUES ('strategy_db', 'strategy');
INSERT INTO `system` VALUES ('strategy_table', 'strategy');
INSERT INTO `system` VALUES ('backtest_table', 'backtest');
INSERT INTO `system` VALUES ('backtest_db', 'backtest_buysell');
INSERT INTO `system` VALUES ('self_stocks_table', 'select');
INSERT INTO `system` VALUES ('headers_table', 'headers');
INSERT INTO `system` VALUES ('stock_list', '300001,300002,300003,300004,300005,300006,300007,300008,300009,300010,300011,300012,300013,300014,300015,300016,300017,300018,300019,300020,300021,300022,300023,300024,300025,300026,300027,300028,300029,300030,300031,300032,300033,300034,300035,300036,300037,300038,300039,300040,300041,300042,300043,300044,300045,300046,300047,300048,300049,300050,300051,300052,300053,300054,300055,300056,300057,300058,300059,300061,300062,300063,300064,300065,300066,300067,300068,300069,300070,300071,300072,300073,300074,300075,300076,300077,300078,300079,300080,300081,300082,300083,300084,300085,300086,300087,300088,300089,300090,300091,300092,300093,300094,300095,300096,300097,300098,300099,300100');
INSERT INTO `system` VALUES ('core_china_table', 'chinalist');
INSERT INTO `system` VALUES ('china_db_name', 'china_history_stocks_data');
INSERT INTO `system` VALUES ('user_db', 'user');
INSERT INTO `system` VALUES ('user_select_db', 'select');
INSERT INTO `system` VALUES ('core_db', 'core');
INSERT INTO `system` VALUES ('factor_table', 'factor');
INSERT INTO `system` VALUES ('factor_db', 'factor');
INSERT INTO `system` VALUES ('baseData_db', 'baseData');
INSERT INTO `system` VALUES ('factor_import_files_db', 'factor_import_files');
INSERT INTO `system` VALUES ('strategy_db', 'strategy');
INSERT INTO `system` VALUES ('strategy_table', 'strategy');
INSERT INTO `system` VALUES ('backtest_table', 'backtest');
INSERT INTO `system` VALUES ('backtest_db', 'backtest_buysell');
INSERT INTO `system` VALUES ('self_stocks_table', 'select');
INSERT INTO `system` VALUES ('headers_table', 'headers');

SET FOREIGN_KEY_CHECKS = 1;
