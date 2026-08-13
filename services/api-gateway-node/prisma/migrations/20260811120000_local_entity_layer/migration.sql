-- Local Entity Layer: MP / Mayor dashboards (constituency, city corp, ward)

ALTER TYPE "AdminUnitType" ADD VALUE 'CONSTITUENCY';
ALTER TYPE "AdminUnitType" ADD VALUE 'CITY_CORPORATION';
ALTER TYPE "AdminUnitType" ADD VALUE 'WARD';

ALTER TYPE "UserRole" ADD VALUE 'MP';
ALTER TYPE "UserRole" ADD VALUE 'MAYOR';
