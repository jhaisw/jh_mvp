import React, { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, Camera, X, Type, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { toast } from "sonner@2.0.3";

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  onTextInput: (text: string) => void;
  isLoading: boolean;
}

export function ImageUploader({ onImageUpload, onTextInput, isLoading }: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      onImageUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const openCamera = useCallback(async () => {
    // 브라우저 지원 여부 확인
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("카메라가 지원되지 않습니다", {
        description: "이 브라우저에서는 카메라 기능을 사용할 수 없습니다. Chrome, Firefox, Safari 최신 버전을 사용해주세요.",
        duration: 6000
      });
      return;
    }

    // HTTPS 확인 (localhost는 예외)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      toast.error("보안 연결이 필요합니다", {
        description: "카메라는 HTTPS 연결에서만 사용할 수 있습니다.",
        duration: 5000
      });
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // 후면 카메라 우선 사용
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      setIsCameraOpen(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
    } catch (error) {
      console.error('카메라 접근 오류:', error);
      
      if (error.name === 'NotFoundError') {
        toast.error("카메라를 찾을 수 없습니다", {
          description: "카메라가 연결되어 있는지 확인하거나, 갤러리에서 이미지를 선택해주세요.",
          duration: 5000
        });
      } else if (error.name === 'NotReadableError') {
        toast.error("카메라가 사용 중입니다", {
          description: "다른 앱에서 카메라를 사용 중입니다. 다른 앱을 종료하고 다시 시도해주세요.",
          duration: 5000
        });
      } else if (error.name === 'OverconstrainedError') {
        toast.error("카메라 설정 오류", {
          description: "카메라가 요청된 설정을 지원하지 않습니다. 갤러리에서 이미지를 선택해주세요.",
          duration: 5000
        });
      } else {
        toast.error("카메라를 열 수 없습니다", {
          description: `${error.message || '알 수 없는 오류가 발생했습니다.'} 갤러리에서 이미지를 선택해주세요.`,
          duration: 5000
        });
      }
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // 캔버스 크기를 비디오와 동일하게 설정
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 비디오 프레임을 캔버스에 그리기
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 캔버스를 Blob으로 변환 후 File 객체 생성
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        closeCamera();
        onImageUpload(file);
      }
    }, 'image/jpeg', 0.9);
  }, [closeCamera, onImageUpload]);

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      toast.error("텍스트를 입력해주세요");
      return;
    }
    
    onTextInput(textInput.trim());
    setTextInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextSubmit();
    }
  };

  if (isCameraOpen) {
    return (
      <Card className="relative p-0 overflow-hidden">
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 md:h-80 object-cover bg-black"
          />
          
          {/* 카메라 컨트롤 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={closeCamera}
              className="bg-black/50 border-white/20 text-white hover:bg-black/70"
            >
              <X className="w-5 h-5 mr-2" />
              취소
            </Button>
            
            <Button
              size="lg"
              onClick={capturePhoto}
              className="bg-white text-black hover:bg-gray-100 px-8"
            >
              <Camera className="w-5 h-5 mr-2" />
              촬영
            </Button>
          </div>
          
          {/* 가이드 텍스트 */}
          <div className="absolute top-4 left-4 right-4">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
              <div className="text-white text-sm text-center space-y-1">
                <p className="font-medium">식재료가 잘 보이도록 촬영하세요</p>
                <p className="text-xs text-white/80">
                  • 충분한 조명 확보 • 식재료를 화면 중앙에 배치 • 여러 개일 때는 겹치지 않게
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 숨겨진 캔버스 (사진 캡처용) */}
        <canvas ref={canvasRef} className="hidden" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 텍스트 입력 (전체 너비) */}
      {!isLoading && (
        <Card className="p-6 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-all duration-200">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted rounded-lg">
              <Type className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="font-medium">텍스트로 입력하기</div>
                <div className="text-muted-foreground text-sm">
                  보유한 식재료를 자유롭게 적어주세요
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="예: 사과 3개, 바나나 2개, 우유 1개"
                  className="flex-1"
                />
                <Button 
                  onClick={handleTextSubmit}
                  size="sm"
                  className="px-3"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                💡 팁: "토마토 5개, 양파 2개", "사과 한 박스", "계란 12개들이" 등 자유롭게 입력하세요
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 업로드와 촬영 나란히 배치 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 파일 업로드 영역 */}
        <Card
          className={`relative p-6 border-2 border-dashed transition-all duration-200 cursor-pointer ${
            isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
          } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-full bg-muted">
              {isLoading ? (
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            
            <div className="text-center">
              <p className="font-medium mb-1">
                {isLoading ? 'AI 분석 중...' : '갤러리에서 업로드'}
              </p>
              <p className="text-muted-foreground text-sm">
                식재료 사진 또는 영수증
              </p>
            </div>
            
            {!isLoading && (
              <Button variant="outline" size="sm" className="pointer-events-none">
                <ImageIcon className="w-4 h-4 mr-2" />
                이미지 선택
              </Button>
            )}
          </div>
        </Card>

        {/* 카메라 촬영 영역 */}
        <Card
          className={`relative p-6 border-2 border-dashed transition-all duration-200 cursor-pointer ${
            isLoading ? 'pointer-events-none opacity-50' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5'
          }`}
          onClick={isLoading ? undefined : openCamera}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-full bg-muted">
              <Camera className="w-6 h-6 text-muted-foreground" />
            </div>
            
            <div className="text-center">
              <p className="font-medium mb-1">카메라로 촬영</p>
              <p className="text-muted-foreground text-sm">
                직접 식재료 촬영하기
              </p>
            </div>
            
            <Button variant="outline" size="sm" className="pointer-events-none">
              <Camera className="w-4 h-4 mr-2" />
              촬영하기
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}