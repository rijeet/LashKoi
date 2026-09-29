import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SeoService } from '@bll/services/seo/SeoService';
import { RawResponse } from '@api/common/decorators/RawResponse.decorator';

@ApiTags('seo')
@Controller()
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get('seo/incidents/:slug')
  incident(@Param('slug') slug: string) {
    return this.seo.incidentMeta(slug);
  }

  @Get('sitemap.xml')
  @RawResponse()
  @Header('Content-Type', 'application/xml')
  async sitemap(@Res() res: Response) {
    const xml = await this.seo.sitemapXml();
    res.send(xml);
  }

  @Get('robots.txt')
  @RawResponse()
  @Header('Content-Type', 'text/plain')
  robots(@Res() res: Response) {
    res.send(this.seo.robotsTxt());
  }
}
