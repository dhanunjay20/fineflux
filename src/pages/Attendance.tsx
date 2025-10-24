import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Calendar, Timer, Fuel, Pause, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import dayjs from "dayjs";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";

export default function Attendance() {
  const { toast } = useToast();
  const organizationId = localStorage.getItem("organizationId") || "";
  const empId = localStorage.getItem("empId") || "";

  const [duties, setDuties] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [attLoading, setAttLoading] = useState<string | null>(null);

  // Fetch all duties and attendance for this employee
  useEffect(() => {
    if (!organizationId || !empId) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/api/organizations/${organizationId}/employee-duties/employee/${empId}`)
      .then((res) => {
        const dutiesList = Array.isArray(res.data) ? res.data : [];
        setDuties(dutiesList);

        // fetch all attendance for the employee
        axios.get(`${API_BASE}/api/organization/${organizationId}/attendance/employee/${empId}`)
          .then((res2) => {
            const attList = Array.isArray(res2.data) ? res2.data : [];
            // map by dutyId+date
            const map: Record<string, any> = {};
            dutiesList.forEach((d) => {
              const att = attList.find(
                (a: any) =>
                  a.dutyId === d.id &&
                  dayjs(a.checkIn || a.dutyDate).isSame(d.dutyDate, "day")
              );
              map[`${d.id}-${d.dutyDate}`] = att;
            });
            setAttendanceMap(map);
            setLoading(false);
          });
      })
      .catch(() => {
        toast({
          title: "Could not load duties and attendance.",
          variant: "destructive"
        });
        setLoading(false);
      });
  }, [organizationId, empId, toast]);

  // Helper for break
  const handleBreak = async (att: any, duty: any, action: 'IN' | 'OUT') => {
    setAttLoading(att.id + action);
    try {
      const breaks = Array.isArray(att.breaks) ? [...att.breaks] : [];
      if (action === "IN") {
        breaks.push({ breakIn: dayjs().toISOString(), breakOut: null });
      } else if (action === "OUT") {
        if (!breaks.length || breaks[breaks.length - 1].breakOut) {
          toast({ title: "No break started!", variant: "destructive" });
          setAttLoading(null);
          return;
        }
        breaks[breaks.length - 1].breakOut = dayjs().toISOString();
      }
      const dto = { ...att, breaks, status: "present" };
      const res = await axios.put(`${API_BASE}/api/organization/${organizationId}/attendance/${att.id}`, dto);
      setAttendanceMap((prev) => ({
        ...prev,
        [`${duty.id}-${duty.dutyDate}`]: res.data,
      }));
      toast({ title: action === "IN" ? "Break Started" : "Break Ended" });
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setAttLoading(null);
    }
  };

  // Check In/Out
  const handleCheck = async (duty: any, att: any, action: "IN" | "OUT") => {
    setAttLoading(duty.id + action);
    try {
      if (action === "IN") {
        const dto = {
          organizationId,
          empId,
          checkIn: dayjs().toISOString(),
          status: "present",
          dutyId: duty.id,
          dutyDate: duty.dutyDate,
          breaks: [], // new attendance, no breaks yet
        };
        const res = await axios.post(
          `${API_BASE}/api/organization/${organizationId}/attendance`,
          dto
        );
        setAttendanceMap((prev) => ({
          ...prev,
          [`${duty.id}-${duty.dutyDate}`]: res.data,
        }));
        toast({ title: "Checked in!", description: `Duty: ${duty.shiftStart} - ${duty.shiftEnd}` });
      } else if (action === "OUT" && att) {
        const dto = {
          ...att,
          checkOut: dayjs().toISOString(),
          status: "present",
        };
        const res = await axios.put(
          `${API_BASE}/api/organization/${organizationId}/attendance/${att.id}`,
          dto
        );
        setAttendanceMap((prev) => ({
          ...prev,
          [`${duty.id}-${duty.dutyDate}`]: res.data,
        }));
        toast({ title: "Checked out!" });
      }
    } catch {
      toast({
        title: action === "IN" ? "Check in failed" : "Check out failed",
        variant: "destructive"
      });
    } finally {
      setAttLoading(null);
    }
  };

  const formatTime = (t?: string) => (t ? dayjs(t).format("hh:mm A") : "--");

  // Duty Sorting
  const today = dayjs().format("YYYY-MM-DD");
  const pastDuties = duties.filter((d) => dayjs(d.dutyDate).isBefore(today, "day"));
  const todayDuties = duties.filter((d) => dayjs(d.dutyDate).isSame(today, "day"));
  const futureDuties = duties.filter((d) => dayjs(d.dutyDate).isAfter(today, "day"));

  // Card rendering helper
  function renderDuty(duty: any, att: any) {
    const checkedIn = !!att?.checkIn;
    const checkedOut = !!att?.checkOut;
    // for breaks
    const breaks: { breakIn: string; breakOut: string | null }[] = Array.isArray(att?.breaks) ? att.breaks : [];
    const onBreak = !!breaks.length && breaks[breaks.length - 1].breakIn && !breaks[breaks.length - 1].breakOut;

    return (
      <Card key={duty.id + duty.dutyDate} className="mb-4">
        <CardHeader>
          <CardTitle className="flex gap-3 items-center">
            <Fuel className="h-5 w-5 text-blue-600"/>
            Duty: {duty.shiftStart} - {duty.shiftEnd} ({dayjs(duty.dutyDate).format("DD MMM YYYY")})
            <Badge className={checkedOut
              ? "bg-green-100 text-green-700"
              : checkedIn
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }>
              {checkedOut ? "Completed" : checkedIn ? (onBreak ? "On Break" : "In Progress") : "Pending"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 items-center flex-wrap">
            <div>
              <div className="text-xs text-muted-foreground">Check In</div>
              <div className="font-bold">{formatTime(att?.checkIn)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Check Out</div>
              <div className="font-bold">{formatTime(att?.checkOut)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Products</div>
              <div>{Array.isArray(duty.products) ? duty.products.join(", ") : duty.productId || "--"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Guns</div>
              <div>{Array.isArray(duty.guns) ? duty.guns.join(", ") : (duty.gunIds || []).join(", ") || "--"}</div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            {/* Check-In/Out Controls */}
            {!checkedIn && (
              <Button
                onClick={() => handleCheck(duty, null, "IN")}
                disabled={!!attLoading}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {attLoading === (duty.id + "IN") ? "Checking In..." : "Check In"}
              </Button>
            )}
            {checkedIn && !checkedOut && (
              <>
                {/* Break Controls */}
                {!onBreak && (
                  <Button
                    onClick={() => handleBreak(att, duty, "IN")}
                    disabled={!!attLoading}
                    className="bg-yellow-600 text-white hover:bg-yellow-700"
                  >
                    {attLoading === (att.id + "IN") ? "Starting Break..." : (<><Pause className="mr-1 h-4 w-4"/>Break</>)}
                  </Button>
                )}
                {onBreak && (
                  <Button
                    onClick={() => handleBreak(att, duty, "OUT")}
                    disabled={!!attLoading}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {attLoading === (att.id + "OUT") ? "Ending Break..." : (<><Play className="mr-1 h-4 w-4"/>Resume</>)}
                  </Button>
                )}
                <Button
                  onClick={() => handleCheck(duty, att, "OUT")}
                  disabled={!!attLoading || onBreak}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {attLoading === (duty.id + "OUT") ? "Checking Out..." : "Check Out"}
                </Button>
              </>
            )}
            {checkedOut && (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle className="mr-1 h-4 w-4" /> Duty Completed
              </Badge>
            )}
          </div>
          {/* Show all break intervals */}
          {breaks.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              <div className="font-semibold mb-1">Breaks:</div>
              {breaks.map((br, idx) => (
                <div key={idx}>
                  <span>Break {idx + 1} In: <span className="font-bold">{formatTime(br.breakIn)}</span></span>
                  <span className="mx-1"> | </span>
                  <span>Out: <span className="font-bold">{formatTime(br.breakOut)}</span></span>
                </div>
              ))}
              {onBreak && (
                <div className="text-orange-500 font-bold">Currently on break</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Your Assigned Duties</h1>
        <p className="text-muted-foreground">Check attendance, mark breaks, and view all your shift records.</p>
      </div>

      {loading ? (
        <Card><CardContent className="text-center py-8">Loading duties...</CardContent></Card>
      ) : (
        <>
          {/* Today Section */}
          <h2 className="text-xl font-semibold mb-1">Today's Duties</h2>
          {todayDuties.length === 0 && <div>No duties for today.</div>}
          {todayDuties.map((d) =>
            renderDuty(d, attendanceMap[`${d.id}-${d.dutyDate}`])
          )}

          {/* Future Duties */}
          <h2 className="text-xl font-semibold mt-8 mb-1">Future Duties</h2>
          {futureDuties.length === 0 && <div>No upcoming duties.</div>}
          {futureDuties.map((d) =>
            renderDuty(d, attendanceMap[`${d.id}-${d.dutyDate}`])
          )}

          {/* Past Duties */}
          <h2 className="text-xl font-semibold mt-8 mb-1">Past Duties</h2>
          {pastDuties.length === 0 && <div>No past duties.</div>}
          {pastDuties.map((d) =>
            renderDuty(d, attendanceMap[`${d.id}-${d.dutyDate}`])
          )}
        </>
      )}
    </div>
  );
}
