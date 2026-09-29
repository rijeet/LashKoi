import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('admin_areas')
export class AdminAreas {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  pcode!: string;

  @Column({ name: 'parent_pcode', type: 'varchar', length: 20, nullable: true })
  parentPcode?: string | null;

  @Column({ type: 'varchar', length: 20 })
  level!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 200 })
  nameEn!: string;

  @Column({ name: 'name_bn', type: 'varchar', length: 200, nullable: true })
  nameBn?: string | null;

  @Column({ name: 'division_pcode', type: 'varchar', length: 20, nullable: true })
  divisionPcode?: string | null;

  @Column({ name: 'district_pcode', type: 'varchar', length: 20, nullable: true })
  districtPcode?: string | null;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  centroid?: string | null;

  @Column({ name: 'bbox_west', type: 'float', nullable: true })
  bboxWest?: number | null;

  @Column({ name: 'bbox_south', type: 'float', nullable: true })
  bboxSouth?: number | null;

  @Column({ name: 'bbox_east', type: 'float', nullable: true })
  bboxEast?: number | null;

  @Column({ name: 'bbox_north', type: 'float', nullable: true })
  bboxNorth?: number | null;
}
