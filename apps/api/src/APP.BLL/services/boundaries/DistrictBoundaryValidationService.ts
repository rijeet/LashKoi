import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import type { DataSource } from 'typeorm';
import { ApiHttpException } from '@shared/exceptions/ApiHttpException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';

type DistrictCollection = GeoJSON.FeatureCollection;

@Injectable()
export class DistrictBoundaryValidationService {
  private geometryByPcode: Map<string, GeoJSON.Geometry> | null = null;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private loadGeometries(): Map<string, GeoJSON.Geometry> {
    if (this.geometryByPcode) return this.geometryByPcode;

    const defaultPath = path.resolve(
      process.cwd(),
      '../web/public/geo/bd-districts.json',
    );
    const filePath = process.env.DISTRICTS_GEOJSON ?? defaultPath;
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `District boundaries GeoJSON not found: ${filePath}. Set DISTRICTS_GEOJSON or run npm run web:geo.`,
      );
    }

    const collection = JSON.parse(
      fs.readFileSync(filePath, 'utf8'),
    ) as DistrictCollection;

    const map = new Map<string, GeoJSON.Geometry>();
    for (const f of collection.features) {
      const pcode =
        (f.properties?.pcode as string) ??
        (f.properties?.districtPcode as string);
      if (pcode && f.geometry) map.set(pcode, f.geometry);
    }
    this.geometryByPcode = map;
    return map;
  }

  async assertPointInDistrict(
    lat: number,
    lng: number,
    districtPcode: string,
  ): Promise<void> {
    const geometries = this.loadGeometries();
    const geometry = geometries.get(districtPcode);
    if (!geometry) {
      throw new ApiHttpException(
        HttpStatus.BAD_REQUEST,
        'Unknown district pcode',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    const [{ contains }] = await this.dataSource.query<
      Array<{ contains: boolean }>
    >(
      `SELECT ST_Contains(
         ST_SetSRID(ST_GeomFromGeoJSON($1::json), 4326),
         ST_SetSRID(ST_MakePoint($2, $3), 4326)
       ) AS contains`,
      [JSON.stringify(geometry), lng, lat],
    );

    if (!contains) {
      throw new ApiHttpException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Map point must be inside the selected district',
        ErrorCode.LOCATION_OUTSIDE_DISTRICT,
      );
    }
  }
}
