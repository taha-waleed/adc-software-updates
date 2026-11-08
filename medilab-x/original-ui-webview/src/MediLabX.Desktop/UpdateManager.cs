using System;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text.Json;
namespace MediLabX.Desktop;
internal sealed class UpdateManager(string targetFolder)
{
 public const string ManifestUrl="https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilab-x/update.json";
 private const string InitialVersion="10.0.11";
 private readonly string _folder=targetFolder;
 private readonly string _index=Path.Combine(targetFolder,"index.html");
 private readonly string _old=Path.Combine(targetFolder,"index.previous.html");
 private readonly string _versionFile=Path.Combine(targetFolder,"html-version.txt");
 private static readonly HttpClient Http=new(){Timeout=TimeSpan.FromSeconds(16)};
 private string CurrentVersion=>File.Exists(_versionFile)?File.ReadAllText(_versionFile).Trim():InitialVersion;
 public sealed record Check(bool Ok,bool Available,string Version,string? Url,string? Sha,string? Error)
 {
  public object ToJs()=>new{ok=Ok,available=Available,kind="html",version=Version,
    htmlVersion=Version,htmlAvailable=Available,htmlUrl=Url,htmlSha256=Sha,downloadUrl=(string?)null,
    notes=Available?new[]{"MediLab X HTML UI improvements; native host and saved local data unchanged"}:Array.Empty<string>(),error=Error??""};
 }
 public void SeedBundledUi(string packageAssets)
 {
  Directory.CreateDirectory(_folder);
  if(!File.Exists(_index))
  {
   var source=Path.Combine(packageAssets,"index.html");
   if(!File.Exists(source))throw new FileNotFoundException("Bundled MediLab X interface is missing",source);
   File.Copy(source,_index);
   File.WriteAllText(_versionFile,InitialVersion);
  }
  foreach(var file in new[]{"kharian-referring-directory.json","MediLab-Heartbeat.png"})
  {
   var source=Path.Combine(packageAssets,file);
   var dest=Path.Combine(_folder,file);
   if(File.Exists(source)&&!File.Exists(dest))File.Copy(source,dest);
  }
 }
 private static int Compare(string a,string b)
 {
  if(Version.TryParse(a,out var av)&&Version.TryParse(b,out var bv))return av.CompareTo(bv);
  return string.CompareOrdinal(a,b);
 }
 public async Task<Check> CheckAsync()
 {
  try
  {
   var json=await Http.GetStringAsync(ManifestUrl);
   using var parsed=JsonDocument.Parse(json);
   var root=parsed.RootElement;
   string? Get(string key)=>root.TryGetProperty(key,out var x)&&x.ValueKind==JsonValueKind.String?x.GetString():null;
   var version=Get("htmlVersion");var url=Get("htmlUrl");var sha=Get("htmlSha256");
   if(string.IsNullOrWhiteSpace(version)||string.IsNullOrWhiteSpace(url)||string.IsNullOrWhiteSpace(sha))
    return new(false,false,CurrentVersion,null,null,"HTML release manifest incomplete");
   if(!Uri.TryCreate(url,UriKind.Absolute,out var u)||u.Scheme!="https"||u.Host!="raw.githubusercontent.com"||
      !u.AbsolutePath.StartsWith("/taha-waleed/adc-software-updates/",StringComparison.OrdinalIgnoreCase))
    return new(false,false,CurrentVersion,null,null,"Update source is not trusted");
   if(sha.Length!=64||!sha.All(Uri.IsHexDigit))return new(false,false,CurrentVersion,null,null,"Invalid HTML SHA-256");
   return new(true,Compare(version,CurrentVersion)>0,version,url,sha,null);
  }
  catch(Exception ex){return new(false,false,CurrentVersion,null,null,"Could not check for updates: "+ex.GetType().Name);}
 }
 public async Task<string?> InstallAsync()
 {
  var info=await CheckAsync();if(!info.Ok||!info.Available||info.Url is null||info.Sha is null)return null;
  var bytes=await Http.GetByteArrayAsync(info.Url);
  if(bytes.Length>30_000_000)throw new InvalidDataException("HTML update is unusually large");
  var hash=Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
  if(!CryptographicOperations.FixedTimeEquals(System.Text.Encoding.ASCII.GetBytes(hash),System.Text.Encoding.ASCII.GetBytes(info.Sha.ToLowerInvariant())))
   throw new InvalidDataException("HTML update checksum mismatch");
  var tmp=Path.Combine(_folder,"index.download.html");await File.WriteAllBytesAsync(tmp,bytes);
  try
  {
   if(File.Exists(_index))File.Copy(_index,_old,true);
   File.Move(tmp,_index,true);
   File.WriteAllText(_versionFile,info.Version);
  }
  finally{if(File.Exists(tmp))File.Delete(tmp);}
  Diagnostics.Write("Verified HTML UI update installed: "+info.Version);
  return info.Version;
 }
 public bool Rollback()
 {
  if(!File.Exists(_old))return false;
  var tmp=Path.Combine(_folder,"index.rollback.tmp");
  File.Copy(_index,tmp,true);
  File.Copy(_old,_index,true);
  File.Copy(tmp,_old,true);
  File.Delete(tmp);
  File.WriteAllText(_versionFile,InitialVersion);
  Diagnostics.Write("HTML UI rollback performed");return true;
 }
}