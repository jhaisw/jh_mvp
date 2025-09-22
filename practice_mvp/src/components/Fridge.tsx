import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Refrigerator, Calendar, Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { toast } from "sonner@2.0.3";

interface FridgeIngredient {
  id: string;
  name: string;
  quantity: number;
  freshness: 'excellent' | 'good' | 'fair' | 'poor';
  storage: string[];
  addedAt: string;
  updatedAt: string;
  expiryDate: string | null;
}

interface FridgeProps {
  ingredients: FridgeIngredient[];
  onIngredientUpdate: (id: string, updates: Partial<FridgeIngredient>) => void;
  onIngredientDelete: (id: string) => void;
}

export function Fridge({ ingredients, onIngredientUpdate, onIngredientDelete }: FridgeProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{name: string; quantity: number; expiryDate: string}>({
    name: '',
    quantity: 0,
    expiryDate: ''
  });

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

  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysDiff;
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days === null) return null;
    
    if (days < 0) return { text: `${Math.abs(days)}일 지남`, color: 'bg-red-500' };
    if (days === 0) return { text: '오늘 만료', color: 'bg-red-500' };
    if (days <= 3) return { text: `${days}일 남음`, color: 'bg-orange-500' };
    if (days <= 7) return { text: `${days}일 남음`, color: 'bg-yellow-500' };
    return { text: `${days}일 남음`, color: 'bg-green-500' };
  };

  const handleEdit = (ingredient: FridgeIngredient) => {
    setEditingId(ingredient.id);
    setEditValues({
      name: ingredient.name,
      quantity: ingredient.quantity,
      expiryDate: ingredient.expiryDate || ''
    });
  };

  const handleSave = () => {
    if (!editingId) return;
    
    onIngredientUpdate(editingId, {
      name: editValues.name,
      quantity: editValues.quantity,
      expiryDate: editValues.expiryDate || null
    });
    
    setEditingId(null);
    toast.success('식재료 정보가 수정되었습니다');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({ name: '', quantity: 0, expiryDate: '' });
  };

  const sortedIngredients = [...ingredients].sort((a, b) => {
    // 유통기한이 임박한 순서로 정렬
    const aExpiry = getDaysUntilExpiry(a.expiryDate);
    const bExpiry = getDaysUntilExpiry(b.expiryDate);
    
    if (aExpiry === null && bExpiry === null) return 0;
    if (aExpiry === null) return 1;
    if (bExpiry === null) return -1;
    
    return aExpiry - bExpiry;
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary text-primary-foreground rounded-lg">
          <Refrigerator className="w-6 h-6" />
        </div>
        <div>
          <h2>너만의 냉장고</h2>
          <p className="text-muted-foreground">
            총 {ingredients.length}가지 식재료 ({ingredients.reduce((sum, item) => sum + item.quantity, 0)}개)
          </p>
        </div>
      </div>

      {/* 요약 정보 */}
      {ingredients.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {ingredients.filter(item => getDaysUntilExpiry(item.expiryDate) === null || getDaysUntilExpiry(item.expiryDate)! > 7).length}
              </div>
              <div className="text-sm text-muted-foreground">신선함</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {ingredients.filter(item => {
                  const days = getDaysUntilExpiry(item.expiryDate);
                  return days !== null && days <= 7 && days > 3;
                }).length}
              </div>
              <div className="text-sm text-muted-foreground">일주일 내</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {ingredients.filter(item => {
                  const days = getDaysUntilExpiry(item.expiryDate);
                  return days !== null && days <= 3 && days >= 0;
                }).length}
              </div>
              <div className="text-sm text-muted-foreground">3일 내</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {ingredients.filter(item => {
                  const days = getDaysUntilExpiry(item.expiryDate);
                  return days !== null && days < 0;
                }).length}
              </div>
              <div className="text-sm text-muted-foreground">만료됨</div>
            </div>
          </Card>
        </div>
      )}

      {/* 식재료 목록 */}
      {ingredients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground mb-4">
              <Refrigerator className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>냉장고가 비어있습니다</p>
              <p className="text-sm">식재료를 인식하면 자동으로 추가됩니다</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedIngredients.map((ingredient) => {
            const isEditing = editingId === ingredient.id;
            const expiryStatus = getExpiryStatus(ingredient.expiryDate);
            
            return (
              <Card key={ingredient.id} className="relative">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* 식재료 정보 */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editValues.name}
                          onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="식재료 이름"
                        />
                        <Input
                          type="number"
                          value={editValues.quantity}
                          onChange={(e) => setEditValues(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                          placeholder="개수"
                          min="1"
                        />
                        <Input
                          type="date"
                          value={editValues.expiryDate}
                          onChange={(e) => setEditValues(prev => ({ ...prev, expiryDate: e.target.value }))}
                          placeholder="유통기한"
                        />
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-medium">{ingredient.name}</h3>
                        <p className="text-sm text-muted-foreground">{ingredient.quantity}개</p>
                      </div>
                    )}

                    {/* 배지들 */}
                    {!isEditing && (
                      <div className="flex flex-wrap gap-1">
                        <Badge 
                          className={`text-white text-xs ${getFreshnessColor(ingredient.freshness)}`}
                        >
                          {getFreshnessText(ingredient.freshness)}
                        </Badge>
                        
                        {expiryStatus && (
                          <Badge 
                            className={`text-white text-xs ${expiryStatus.color}`}
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            {expiryStatus.text}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* 추가 날짜 */}
                    {!isEditing && (
                      <div className="text-xs text-muted-foreground">
                        추가: {new Date(ingredient.addedAt).toLocaleDateString('ko-KR')}
                      </div>
                    )}

                    {/* 액션 버튼들 */}
                    <div className="flex gap-2 pt-2 border-t">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={handleSave}
                            className="flex-1"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            저장
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            className="flex-1"
                          >
                            <X className="w-4 h-4 mr-1" />
                            취소
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(ingredient)}
                            className="flex-1"
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            수정
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`${ingredient.name}을(를) 냉장고에서 제거하시겠습니까?`)) {
                                onIngredientDelete(ingredient.id);
                              }
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
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