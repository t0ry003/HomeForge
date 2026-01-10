'use client';
import { useState } from 'react';
import { proposeDeviceType } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from "sonner"

export default function ProposeDeviceTypePage() {
  const [formData, setFormData] = useState({
    name: '',
    definition: '{\n  "manufacturer": "Acme",\n  "capabilities": ["on_off"]\n}'
  });
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'definition') {
        setJsonError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setJsonError(null);

    // Validate JSON
    let parsedDefinition;
    try {
      parsedDefinition = JSON.parse(formData.definition);
    } catch (err) {
      setJsonError("Invalid JSON format");
      setLoading(false);
      return;
    }

    try {
      await proposeDeviceType({
        name: formData.name,
        definition: parsedDefinition
      });
      toast.success("Device type proposed successfully!");
      setFormData({
        name: '',
        definition: '{\n  "manufacturer": "Acme",\n  "capabilities": ["on_off"]\n}'
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to submit proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Propose New Device Type</CardTitle>
          <CardDescription>
            Define a new device type schema. This will be reviewed by an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Type Name</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="e.g., RGB Light" 
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="definition">Definition (JSON)</Label>
              <Textarea 
                id="definition" 
                name="definition" 
                placeholder="{ ... }" 
                className="font-mono h-48"
                value={formData.definition} 
                onChange={handleChange} 
                required 
              />
              {jsonError && <p className="text-sm text-red-500">{jsonError}</p>}
              <p className="text-xs text-muted-foreground">
                Enter a valid JSON object describing the device capabilities.
              </p>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Proposal'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
