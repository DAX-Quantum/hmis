import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DocumentsService, CreateDocumentDto, UpdateDocumentDto } from './documents.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DocumentCategory } from '@prisma/client';

@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Save document metadata (prescriptions, reports, scans)' })
  create(@Body() dto: CreateDocumentDto, @CurrentUser('id') userId: string) {
    return this.documentsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all documents with category and search filter' })
  @ApiQuery({ name: 'category', required: false, enum: DocumentCategory })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'patientId', required: false })
  findAll(
    @Query('category') category?: DocumentCategory,
    @Query('search') search?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.documentsService.findAll({ category, search, patientId });
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get all documents attached to a patient' })
  findByPatient(@Param('patientId') patientId: string) {
    return this.documentsService.findByPatient(patientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document category or title' })
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document record' })
  delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}

