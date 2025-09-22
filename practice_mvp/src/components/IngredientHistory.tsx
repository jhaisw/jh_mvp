import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, Calendar, Eye, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface IngredientData {
  name: string;
  quantity: number;
  confidence: number;
  freshness: 'excellent' | 'good' | 'fair' | 'poor';
  storage?: string[];
  recipes?: string[];
  nutrition?: any;
  tips?: string[];
}

interface MultipleIngredientsData {
  ingredients: IngredientData[];
  totalCount: number;
  _warning?: string;
}

interface HistoryRecord {
  id: string;
  imageData: string;
  ingredientData: MultipleIngredientsData | IngredientData; // 레거시 지원
  timestamp: string;
  createdAt: string;
}

interface IngredientHistoryProps {
  records: HistoryRecord[];
  onRecordSelect: (record: HistoryRecord) => void;
  onRecordDelete: (recordId: string) => void;
  onClose: () => void;
}

export function IngredientHistory({ records, onRecordSelect, onRecordDelete, onClose }: IngredientHistoryProps) {
  const getFreshnessColor = (freshness: string) => {
    switch (freshness) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getFreshnessText = (freshness: string) => {
    switch (freshness) {
      case 'excellent': return '매우 신선함';
      case 'good': return '신선함';
      case 'fair': return '보통';
      case 'poor': return '신선도 낮음';
      default: return '알 수 없음';
    }
  };

  const getDisplayInfo = (ingredientData: MultipleIngredientsData | IngredientData) => {
    // 새로운 다중 식재료 데이터인지 확인
    if ('ingredients' in ingredientData) {
      const multiData = ingredientData as MultipleIngredientsData;
      if (multiData.ingredients.length === 1) {
        return {
          title: `${multiData.ingredients[0].name} ${multiData.ingredients[0].quantity}개`,
          confidence: multiData.ingredients[0].confidence,
          freshness: multiData.ingredients[0].freshness,
          isMultiple: false
        };
      } else {
        return {
          title: `${multiData.ingredients.length}가지 식재료 (총 ${multiData.totalCount}개)`,
          confidence: Math.round(multiData.ingredients.reduce((sum, ing) => sum + ing.confidence, 0) / multiData.ingredients.length),
          freshness: multiData.ingredients[0].freshness, // 첫 번째 식재료의 신선도
          isMultiple: true,
          additionalCount: multiData.ingredients.length - 1
        };
      }
    } else {
      // 레거시 단일 식재료 데이터
      const singleData = ingredientData as IngredientData;
      return {
        title: `${singleData.name} ${singleData.quantity}개`,
        confidence: singleData.confidence,
        freshness: singleData.freshness,
        isMultiple: false
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>
        <div>
          <h2>인식 기록</h2>
          <p className="text-muted-foreground">
            총 {records.length}개의 식재료 인식 기록이 있습니다
          </p>
        </div>
      </div>

      {/* 기록 목록 */}
      {records.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground mb-4">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>아직 인식 기록이 없습니다</p>
              <p className="text-sm">식재료 사진을 업로드하여 첫 번째 기록을 만들어보세요</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {records.map((record) => {
            const displayInfo = getDisplayInfo(record.ingredientData);
            
            return (
              <Card 
                key={record.id} 
                className="relative hover:shadow-lg transition-all duration-200 group"
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* 이미지 */}
                    <div className="relative cursor-pointer" onClick={() => onRecordSelect(record)}>
                      <img
                        src={record.imageData}
                        alt="식재료"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      
                      {/* 삭제 버튼 - 사진 우상단 */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('이 기록을 삭제하시겠습니까?')) {
                            onRecordDelete(record.id);
                          }
                        }}
                        className="absolute top-2 right-2 w-8 h-8 p-0 bg-black/50 hover:bg-black/70 text-white hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* 정보 */}
                    <div className="space-y-2" onClick={() => onRecordSelect(record)}>
                      <div className="flex items-center justify-between cursor-pointer">
                        <h3 className="truncate">
                          {displayInfo.title}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {displayInfo.confidence}%
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap cursor-pointer">
                        <Badge 
                          className={`text-white text-xs ${getFreshnessColor(displayInfo.freshness)}`}
                        >
                          {getFreshnessText(displayInfo.freshness)}
                        </Badge>
                        
                        {displayInfo.isMultiple && displayInfo.additionalCount && displayInfo.additionalCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            +{displayInfo.additionalCount}개 더
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(record.createdAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}