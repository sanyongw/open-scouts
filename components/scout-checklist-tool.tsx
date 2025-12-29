"use client";

import { useState, useEffect } from "react";
import {
  Square,
  CheckSquare,
  WrenchIcon,
  ChevronDownIcon,
  Pencil,
  X,
  Plus,
  Check,
  MapPin,
  Globe,
} from "lucide-react";
import { Tool, ToolContent } from "@/components/ai-elements/tool";
import { CollapsibleTrigger } from "@/components/ui/shadcn/collapsible";
import { cn } from "@/lib/utils";
import Input from "@/components/ui/shadcn/input";
import Textarea from "@/components/ui/shadcn/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import { supabase } from "@/lib/supabase/client";

// Define ToolUIPart type since it's not exported in current AI SDK version
type ToolUIPart = {
  type: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: any;
  output?: any;
  errorText?: string;
};

type Location = {
  city: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

type ScoutData = {
  id?: string;
  title?: string;
  goal?: string;
  description?: string;
  location?: Location | null;
  search_queries?: string[];
  frequency?: "daily" | "every_3_days" | "weekly" | null;
};

type ScoutChecklistToolProps = {
  toolPart?: ToolUIPart;
  currentScout: ScoutData;
  currentLocation?: Location | null;
  onScoutUpdate?: () => void;
};

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  every_3_days: "Every 3 days",
  weekly: "Weekly",
};

export function ScoutChecklistTool({
  toolPart,
  currentScout,
  currentLocation,
  onScoutUpdate,
}: ScoutChecklistToolProps) {
  void toolPart; // Unused but part of the props interface

  // Edit mode state for each field
  const [editMode, setEditMode] = useState<string | null>(null);

  // Form values
  const [title, setTitle] = useState(currentScout.title || "");
  const [goal, setGoal] = useState(currentScout.goal || "");
  const [description, setDescription] = useState(
    currentScout.description || "",
  );
  const [searchQueries, setSearchQueries] = useState<string[]>(
    currentScout.search_queries || [],
  );
  const [newQuery, setNewQuery] = useState("");
  const [frequency, setFrequency] = useState<
    "daily" | "every_3_days" | "weekly" | null
  >(currentScout.frequency || null);
  const [locationPreference, setLocationPreference] = useState<
    "current" | "any"
  >(
    currentScout.location?.latitude === 0 &&
      currentScout.location?.longitude === 0
      ? "any"
      : "current",
  );
  const [isSaving, setIsSaving] = useState(false);

  // Update form values when currentScout changes
  useEffect(() => {
    setTitle(currentScout.title || "");
    setGoal(currentScout.goal || "");
    setDescription(currentScout.description || "");
    setSearchQueries(currentScout.search_queries || []);
    setFrequency(currentScout.frequency || null);
    const isAnyLocation =
      currentScout.location?.latitude === 0 &&
      currentScout.location?.longitude === 0;
    setLocationPreference(isAnyLocation ? "any" : "current");
  }, [currentScout]);

  const handleSave = async (field: string) => {
    if (!currentScout.id) return;

    setIsSaving(true);
    try {
      let updateData: Record<string, unknown> = {};

      switch (field) {
        case "title":
          updateData = { title };
          break;
        case "goal":
          updateData = { goal };
          break;
        case "description":
          updateData = { description };
          break;
        case "location":
          if (locationPreference === "any") {
            updateData = {
              location: { city: "any", latitude: 0, longitude: 0 },
            };
          } else if (currentLocation) {
            updateData = { location: currentLocation };
          }
          break;
        case "searchQueries":
          updateData = { search_queries: searchQueries };
          break;
        case "frequency":
          updateData = { frequency };
          break;
      }

      const { error } = await supabase
        .from("scouts")
        .update(updateData)
        .eq("id", currentScout.id);

      if (error) {
        console.error("Error saving:", error);
      } else {
        setEditMode(null);
        onScoutUpdate?.();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (field: string) => {
    // Reset values to original
    switch (field) {
      case "title":
        setTitle(currentScout.title || "");
        break;
      case "goal":
        setGoal(currentScout.goal || "");
        break;
      case "description":
        setDescription(currentScout.description || "");
        break;
      case "location":
        const isAnyLocation =
          currentScout.location?.latitude === 0 &&
          currentScout.location?.longitude === 0;
        setLocationPreference(isAnyLocation ? "any" : "current");
        break;
      case "searchQueries":
        setSearchQueries(currentScout.search_queries || []);
        setNewQuery("");
        break;
      case "frequency":
        setFrequency(currentScout.frequency || null);
        break;
    }
    setEditMode(null);
  };

  const handleAddQuery = () => {
    if (newQuery.trim() && searchQueries.length < 5) {
      setSearchQueries([...searchQueries, newQuery.trim()]);
      setNewQuery("");
    }
  };

  const handleRemoveQuery = (index: number) => {
    setSearchQueries(searchQueries.filter((_, i) => i !== index));
  };

  const getLocationDisplay = () => {
    if (
      currentScout.location?.latitude === 0 &&
      currentScout.location?.longitude === 0
    ) {
      return "any";
    }
    return currentScout.location?.city || "Not set";
  };

  const checklistItems = [
    {
      key: "title",
      label: "Title",
      value: currentScout.title,
      filled: Boolean(currentScout.title),
      description: currentScout.title || "Not set",
    },
    {
      key: "goal",
      label: "Goal",
      value: currentScout.goal,
      filled: Boolean(currentScout.goal),
      description: currentScout.goal || "Not set",
    },
    {
      key: "description",
      label: "Description",
      value: currentScout.description,
      filled: Boolean(currentScout.description),
      description: currentScout.description || "Not set",
    },
    {
      key: "location",
      label: "Location",
      value: currentScout.location,
      filled: Boolean(currentScout.location),
      description: getLocationDisplay(),
    },
    {
      key: "searchQueries",
      label: "Search Queries",
      value: currentScout.search_queries,
      filled: Boolean(
        currentScout.search_queries && currentScout.search_queries.length > 0,
      ),
      description:
        currentScout.search_queries && currentScout.search_queries.length > 0
          ? currentScout.search_queries.join(", ")
          : "Not set",
    },
    {
      key: "frequency",
      label: "Frequency",
      value: currentScout.frequency,
      filled: Boolean(currentScout.frequency),
      description: currentScout.frequency
        ? frequencyLabels[currentScout.frequency]
        : "Not set",
    },
  ];

  const completedCount = checklistItems.filter((item) => item.filled).length;
  const totalCount = checklistItems.length;

  const renderEditForm = (itemKey: string) => {
    switch (itemKey) {
      case "title":
        return (
          <div className="mt-8 space-y-8">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter scout title"
              className="w-full text-body-small"
              autoFocus
            />
            <div className="flex items-center gap-8 justify-end">
              <button
                type="button"
                onClick={() => handleCancel("title")}
                disabled={isSaving}
                className="p-6 hover:bg-muted/50 rounded-4 transition-colors text-muted-foreground"
              >
                <X className="w-14 h-14" />
              </button>
              <button
                type="button"
                onClick={() => handleSave("title")}
                disabled={isSaving || !title.trim()}
                className="p-6 hover:bg-primary/10 rounded-4 transition-colors text-primary disabled:opacity-50"
              >
                <Check className="w-14 h-14" />
              </button>
            </div>
          </div>
        );

      case "goal":
        return (
          <div className="mt-8 space-y-8">
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Enter scout goal"
              className="w-full text-body-small"
              autoFocus
            />
            <div className="flex items-center gap-8 justify-end">
              <button
                type="button"
                onClick={() => handleCancel("goal")}
                disabled={isSaving}
                className="p-6 hover:bg-muted/50 rounded-4 transition-colors text-muted-foreground"
              >
                <X className="w-14 h-14" />
              </button>
              <button
                type="button"
                onClick={() => handleSave("goal")}
                disabled={isSaving || !goal.trim()}
                className="p-6 hover:bg-primary/10 rounded-4 transition-colors text-primary disabled:opacity-50"
              >
                <Check className="w-14 h-14" />
              </button>
            </div>
          </div>
        );

      case "description":
        return (
          <div className="mt-8 space-y-8">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter scout description"
              className="w-full text-body-small min-h-[80px]"
              autoFocus
            />
            <div className="flex items-center gap-8 justify-end">
              <button
                type="button"
                onClick={() => handleCancel("description")}
                disabled={isSaving}
                className="p-6 hover:bg-muted/50 rounded-4 transition-colors text-muted-foreground"
              >
                <X className="w-14 h-14" />
              </button>
              <button
                type="button"
                onClick={() => handleSave("description")}
                disabled={isSaving || !description.trim()}
                className="p-6 hover:bg-primary/10 rounded-4 transition-colors text-primary disabled:opacity-50"
              >
                <Check className="w-14 h-14" />
              </button>
            </div>
          </div>
        );

      case "location":
        return (
          <div className="mt-8 space-y-8">
            <div className="space-y-8 p-8 bg-muted/20 rounded-6">
              <label className="flex items-center gap-8 cursor-pointer p-6 rounded-4 hover:bg-muted/30 transition-colors">
                <input
                  type="radio"
                  name="location"
                  value="current"
                  checked={locationPreference === "current"}
                  onChange={(e) =>
                    setLocationPreference(e.target.value as "current" | "any")
                  }
                  className="w-14 h-14 text-primary"
                />
                <MapPin className="w-14 h-14 text-muted-foreground" />
                <span className="text-body-small text-foreground">
                  Current Location
                </span>
                {locationPreference === "current" && currentLocation && (
                  <span className="text-body-small text-muted-foreground ml-auto">
                    {currentLocation.city}
                    {currentLocation.state && `, ${currentLocation.state}`}
                  </span>
                )}
              </label>
              <label className="flex items-center gap-8 cursor-pointer p-6 rounded-4 hover:bg-muted/30 transition-colors">
                <input
                  type="radio"
                  name="location"
                  value="any"
                  checked={locationPreference === "any"}
                  onChange={(e) =>
                    setLocationPreference(e.target.value as "current" | "any")
                  }
                  className="w-14 h-14 text-primary"
                />
                <Globe className="w-14 h-14 text-muted-foreground" />
                <span className="text-body-small text-foreground">
                  Any Location
                </span>
              </label>
            </div>
            <div className="flex items-center gap-8 justify-end">
              <button
                type="button"
                onClick={() => handleCancel("location")}
                disabled={isSaving}
                className="p-6 hover:bg-muted/50 rounded-4 transition-colors text-muted-foreground"
              >
                <X className="w-14 h-14" />
              </button>
              <button
                type="button"
                onClick={() => handleSave("location")}
                disabled={isSaving}
                className="p-6 hover:bg-primary/10 rounded-4 transition-colors text-primary disabled:opacity-50"
              >
                <Check className="w-14 h-14" />
              </button>
            </div>
          </div>
        );

      case "searchQueries":
        return (
          <div className="mt-8 space-y-8">
            <div className="space-y-6">
              {searchQueries.map((query, index) => (
                <div key={index} className="flex items-center gap-8">
                  <Input
                    value={query}
                    onChange={(e) => {
                      const newQueries = [...searchQueries];
                      newQueries[index] = e.target.value;
                      setSearchQueries(newQueries);
                    }}
                    className="flex-1 text-body-small"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveQuery(index)}
                    className="p-6 hover:bg-muted/50 rounded-4 transition-colors text-muted-foreground shrink-0"
                  >
                    <X className="w-14 h-14" />
                  </button>
                </div>
              ))}
              {searchQueries.length < 5 && (
                <div className="flex items-center gap-8">
                  <Input
                    value={newQuery}
                    onChange={(e) => setNewQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddQuery();
                      }
                    }}
                    placeholder="Add a search query (max 5)"
                    className="flex-1 text-body-small"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuery}
                    disabled={!newQuery.trim()}
                    className="p-6 hover:bg-primary/10 rounded-4 transition-colors text-primary disabled:opacity-50 shrink-0"
                  >
                    <Plus className="w-14 h-14" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-8 justify-end">
              <button
                type="button"
                onClick={() => handleCancel("searchQueries")}
                disabled={isSaving}
                className="p-6 hover:bg-muted/50 rounded-4 transition-colors text-muted-foreground"
              >
                <X className="w-14 h-14" />
              </button>
              <button
                type="button"
                onClick={() => handleSave("searchQueries")}
                disabled={isSaving || searchQueries.length === 0}
                className="p-6 hover:bg-primary/10 rounded-4 transition-colors text-primary disabled:opacity-50"
              >
                <Check className="w-14 h-14" />
              </button>
            </div>
          </div>
        );

      case "frequency":
        return (
          <div className="mt-8 space-y-8">
            <Select
              value={frequency || undefined}
              onValueChange={(value) =>
                setFrequency(value as "daily" | "every_3_days" | "weekly")
              }
            >
              <SelectTrigger className="w-full text-body-small h-36">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{frequencyLabels.daily}</SelectItem>
                <SelectItem value="every_3_days">
                  {frequencyLabels.every_3_days}
                </SelectItem>
                <SelectItem value="weekly">{frequencyLabels.weekly}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-8 justify-end">
              <button
                type="button"
                onClick={() => handleCancel("frequency")}
                disabled={isSaving}
                className="p-6 hover:bg-muted/50 rounded-4 transition-colors text-muted-foreground"
              >
                <X className="w-14 h-14" />
              </button>
              <button
                type="button"
                onClick={() => handleSave("frequency")}
                disabled={isSaving || !frequency}
                className="p-6 hover:bg-primary/10 rounded-4 transition-colors text-primary disabled:opacity-50"
              >
                <Check className="w-14 h-14" />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Tool defaultOpen>
      <CollapsibleTrigger
        className={cn("flex w-full items-center justify-between gap-16 p-12")}
      >
        <div className="flex items-center gap-8">
          <WrenchIcon className="w-16 h-16 text-muted-foreground" />
          <span className="font-medium text-body-medium">
            Scout Configuration
          </span>
          <span className="text-body-small text-muted-foreground ml-8">
            {completedCount}/{totalCount}
          </span>
        </div>
        <ChevronDownIcon className="w-16 h-16 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <ToolContent>
        <div className="p-12 pt-0">
          <div className="space-y-6">
            {checklistItems.map((item) => (
              <div
                key={item.key}
                className={cn(
                  "p-6 rounded-6 transition-colors",
                  editMode === item.key ? "bg-muted/40" : "hover:bg-muted/30",
                )}
              >
                <div className="flex items-start gap-8">
                  {item.filled ? (
                    <CheckSquare className="w-16 h-16 text-primary mt-2 shrink-0" />
                  ) : (
                    <Square className="w-16 h-16 text-muted-foreground/50 mt-2 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-8">
                      <span
                        className={`text-body-small font-bold! ${item.filled ? "text-foreground font-medium" : "text-muted-foreground"}`}
                      >
                        {item.label}
                      </span>
                      {editMode !== item.key && currentScout.id && (
                        <button
                          type="button"
                          onClick={() => setEditMode(item.key)}
                          className="p-4 hover:bg-muted/50 rounded-4 transition-colors opacity-0 group-hover:opacity-100 hover:!opacity-100"
                          style={{ opacity: 1 }}
                        >
                          <Pencil className="w-12 h-12 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    {editMode === item.key ? (
                      renderEditForm(item.key)
                    ) : (
                      <p
                        className={`text-body-small mt-2 ${item.filled ? "text-muted-foreground" : "text-muted-foreground/60"}`}
                      >
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ToolContent>
    </Tool>
  );
}
