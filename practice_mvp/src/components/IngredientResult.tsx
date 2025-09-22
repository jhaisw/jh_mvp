import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Leaf, 
  Clock, 
  Refrigerator, 
  ChefHat, 
  Heart,
  Sparkles,
  Package,
  X,
  Trash2,
  AlertTriangle,
  Edit2,
  Check,
  Plus
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface IngredientData {
  name: string;
  quantity: number;
  confidence: number;
  freshness: 'excellent' | 'good' | 'fair' | 'poor';
  storage: string[];
  recipes: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    vitamin: string;
  };
  tips: string[];
}

interface MultipleIngredientsData {
  ingredients: IngredientData[];
  totalCount: number;
  _warning?: string;
}

interface IngredientResultProps {
  image: string;
  data: MultipleIngredientsData;
  onReset: () => void;
  onIngredientDelete: (index: number) => void;
  onIngredientUpdate: (index: number, name: string, quantity: number) => void;
  onIngredientAdd: (name: string, quantity: number) => Promise<void>;
}

export function IngredientResult({ image, data, onReset, onIngredientDelete, onIngredientUpdate, onIngredientAdd }: IngredientResultProps) {
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'name' | 'quantity' | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientQuantity, setNewIngredientQuantity] = useState('1');
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
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

  const avgConfidence = data.ingredients.reduce((sum, ing) => sum + ing.confidence, 0) / data.ingredients.length;

  const handleEditStart = (index: number, field: 'name' | 'quantity', currentValue: string | number) => {
    setEditingIndex(index);
    setEditingField(field);
    setEditValue(currentValue.toString());
  };

  const handleEditSave = () => {
    if (editingIndex === null || editingField === null) return;
    
    const ingredient = data.ingredients[editingIndex];
    
    if (editingField === 'name') {
      const trimmedName = editValue.trim();
      if (trimmedName && trimmedName !== ingredient.name) {
        onIngredientUpdate(editingIndex, trimmedName, ingredient.quantity);
      }
    } else if (editingField === 'quantity') {
      const newQuantity = parseInt(editValue);
      if (!isNaN(newQuantity) && newQuantity > 0 && newQuantity !== ingredient.quantity) {
        onIngredientUpdate(editingIndex, ingredient.name, newQuantity);
      }
    }
    
    handleEditCancel();
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditingField(null);
    setEditValue('');
  };

  const handleAddIngredient = async () => {
    const trimmedName = newIngredientName.trim();
    const quantity = parseInt(newIngredientQuantity);
    
    if (trimmedName && !isNaN(quantity) && quantity > 0) {
      setIsAddingIngredient(true);
      try {
        await onIngredientAdd(trimmedName, quantity);
        setNewIngredientName('');
        setNewIngredientQuantity('1');
        setShowAddForm(false);
      } catch (error) {
        console.error('식재료 추가 중 오류:', error);
      } finally {
        setIsAddingIngredient(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };
  
  return (
    <div className="space-y-6">
      {/* 이미지와 기본 정보 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <img 
                src={image} 
                alt="업로드된 식재료" 
                className="w-32 h-32 object-cover rounded-lg"
              />
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {data.ingredients.length === 1 ? (
                    <div className="flex items-center gap-3">
                      {editingIndex === 0 && editingField === 'name' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="h-9 text-xl font-medium"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEditSave}
                            className="w-8 h-8 p-0"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                        </div>
                      ) : editingIndex === 0 && editingField === 'quantity' ? (
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl">{data.ingredients[0].name}</h2>
                          <Input
                            type="number"
                            min="1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="h-9 w-20 text-xl font-medium"
                            autoFocus
                          />
                          <span className="text-2xl">개</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEditSave}
                            className="w-8 h-8 p-0"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <h2 
                            className="text-2xl cursor-pointer hover:text-primary transition-colors"
                            onClick={() => handleEditStart(0, 'name', data.ingredients[0].name)}
                          >
                            {data.ingredients[0].name}
                          </h2>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditStart(0, 'name', data.ingredients[0].name)}
                            className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <span 
                            className="text-2xl cursor-pointer hover:text-primary transition-colors"
                            onClick={() => handleEditStart(0, 'quantity', data.ingredients[0].quantity)}
                          >
                            {data.ingredients[0].quantity}개
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditStart(0, 'quantity', data.ingredients[0].quantity)}
                            className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <h2 className="text-2xl">{data.ingredients.length}가지 식재료</h2>
                  )}
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    평균 신뢰도 {Math.round(avgConfidence)}%
                  </Badge>
                </div>
                
                {data.ingredients.length > 1 && (
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span>총 개수: <strong>{data.totalCount}개</strong></span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={onReset}
                  className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
                >
                  새 이미지 업로드
                </button>
                
                {data.ingredients.length === 1 ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      식재료 추가
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="px-4 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors flex items-center gap-1">
                          <Trash2 className="w-3 h-3" />
                          삭제
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            식재료 삭제
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            <strong>{data.ingredients[0].name} {data.ingredients[0].quantity}개</strong>와 관련된 모든 정보를 삭제하고 처음 화면으로 돌아가시겠습니까?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onIngredientDelete(0)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            삭제하기
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Trash2 className="w-3 h-3" />
                    개별 삭제 가능
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 식재료 추가 폼 (단일 식재료일 때) */}
      {data.ingredients.length === 1 && showAddForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              새 식재료 추가
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">식재료 이름</label>
                <Input
                  placeholder="식재료 이름을 입력하세요"
                  value={newIngredientName}
                  onChange={(e) => setNewIngredientName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">개수</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={newIngredientQuantity}
                    onChange={(e) => setNewIngredientQuantity(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">개</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleAddIngredient}
                disabled={!newIngredientName.trim() || !newIngredientQuantity || isAddingIngredient}
                className="flex items-center gap-1"
              >
                {isAddingIngredient ? (
                  <>
                    <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                    AI 정보 생성 중...
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    추가하기
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
                disabled={isAddingIngredient}
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 다중 식재료인 경우 각 식재료 요약 카드 */}
      {data.ingredients.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              인식된 식재료
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                추가
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.ingredients.map((ingredient, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2 relative group">
                  {/* 삭제 버튼 - 여러 개일 때만 표시 */}
                  {data.ingredients.length > 1 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full bg-red-100 hover:bg-red-200 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            식재료 삭제
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            <strong>{ingredient.name} {ingredient.quantity}개</strong>를 목록에서 삭제하시겠습니까?
                            <br />이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onIngredientDelete(index)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            삭제하기
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  <div className="flex items-center justify-between">
                    {editingIndex === index && editingField === 'name' ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyPress}
                          className="h-7 text-sm"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleEditSave}
                          className="w-6 h-6 p-0"
                        >
                          <Check className="w-3 h-3 text-green-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{ingredient.name}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditStart(index, 'name', ingredient.name)}
                          className="w-4 h-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    
                    {editingIndex === index && editingField === 'quantity' ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyPress}
                          className="h-7 w-16 text-sm"
                          autoFocus
                        />
                        <span className="text-sm">개</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleEditSave}
                          className="w-6 h-6 p-0"
                        >
                          <Check className="w-3 h-3 text-green-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => handleEditStart(index, 'quantity', ingredient.quantity)}
                        >
                          {ingredient.quantity}개
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditStart(index, 'quantity', ingredient.quantity)}
                          className="w-4 h-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Leaf className="w-3 h-3 text-green-600" />
                    <Badge className={`text-xs text-white ${getFreshnessColor(ingredient.freshness)}`}>
                      {getFreshnessText(ingredient.freshness)}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    신뢰도: {ingredient.confidence}%
                  </div>
                </div>
              ))}
              
              {/* 새 식재료 추가 폼 */}
              {showAddForm && (
                <div className="p-4 border border-dashed border-primary rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">새 식재료 추가</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddForm(false)}
                      className="w-4 h-4 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      placeholder="식재료 이름"
                      value={newIngredientName}
                      onChange={(e) => setNewIngredientName(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="개수"
                        value={newIngredientQuantity}
                        onChange={(e) => setNewIngredientQuantity(e.target.value)}
                        className="h-8 w-20 text-sm"
                      />
                      <span className="text-sm text-muted-foreground">개</span>
                    </div>
                    
                    <Button
                      onClick={handleAddIngredient}
                      disabled={!newIngredientName.trim() || !newIngredientQuantity || isAddingIngredient}
                      className="w-full h-8 text-sm"
                    >
                      {isAddingIngredient ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                          AI 정보 생성 중...
                        </div>
                      ) : (
                        '추가하기'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 각 식재료별 상세 정보 */}
      {data.ingredients.map((ingredient, index) => (
        <div key={index} className="space-y-6">
          {data.ingredients.length > 1 && (
            <div className="flex items-center gap-2">
              <div className="h-px bg-border flex-1" />
              <div className="flex items-center gap-2">
                <h3 className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm">
                  {ingredient.name} {ingredient.quantity}개
                </h3>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="w-7 h-7 p-0 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        식재료 삭제
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        <strong>{ingredient.name} {ingredient.quantity}개</strong>와 관련된 모든 정보를 삭제하시겠습니까?
                        <br />이 작업은 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onIngredientDelete(index)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        삭제하기
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="h-px bg-border flex-1" />
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 보관 방법 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Refrigerator className="w-5 h-5 text-blue-600" />
                  보관 방법
                  {data.ingredients.length > 1 && (
                    <Badge variant="outline" className="ml-auto">{ingredient.name}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ingredient.storage.map((tip, tipIndex) => (
                  <div key={tipIndex} className="flex items-start gap-2">
                    {tip === '정보를 불러오는 중...' ? (
                      <>
                        <div className="animate-spin w-1.5 h-1.5 border border-primary border-t-transparent rounded-full mt-2 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground italic">{tip}</p>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <p className="text-sm">{tip}</p>
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 추천 요리법 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-orange-600" />
                  추천 요리법
                  {data.ingredients.length > 1 && (
                    <Badge variant="outline" className="ml-auto">{ingredient.name}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ingredient.recipes.map((recipe, recipeIndex) => (
                  <div key={recipeIndex} className="flex items-center gap-2">
                    {recipe === '정보를 불러오는 중...' ? (
                      <>
                        <div className="animate-spin w-3 h-3 border border-muted-foreground border-t-transparent rounded-full flex-shrink-0" />
                        <p className="text-sm text-muted-foreground italic">{recipe}</p>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <p className="text-sm">{recipe}</p>
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 영양 정보 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-600" />
                영양 정보 (100g 기준)
                {data.ingredients.length > 1 && (
                  <Badge variant="outline" className="ml-auto">{ingredient.name}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl mb-1">{ingredient.nutrition.calories}</div>
                  <div className="text-sm text-muted-foreground">칼로리</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">{ingredient.nutrition.protein}g</div>
                  <div className="text-sm text-muted-foreground">단백질</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">{ingredient.nutrition.carbs}g</div>
                  <div className="text-sm text-muted-foreground">탄수화물</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">{ingredient.nutrition.fat}g</div>
                  <div className="text-sm text-muted-foreground">지방</div>
                </div>
                <div className="text-center">
                  <div className="text-xl mb-1">{ingredient.nutrition.vitamin}</div>
                  <div className="text-sm text-muted-foreground">주요 비타민</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 팁 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                💡 유용한 팁
                {data.ingredients.length > 1 && (
                  <Badge variant="outline" className="ml-auto">{ingredient.name}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ingredient.tips.map((tip, tipIndex) => (
                <p key={tipIndex} className={`text-sm p-3 bg-muted rounded-lg ${tip === '정보를 불러오는 중...' ? 'text-muted-foreground italic' : ''}`}>
                  {tip === '정보를 불러오는 중...' && (
                    <span className="inline-flex items-center gap-2">
                      <div className="animate-spin w-3 h-3 border border-muted-foreground border-t-transparent rounded-full" />
                      {tip}
                    </span>
                  )}
                  {tip !== '정보를 불러오는 중...' && tip}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}