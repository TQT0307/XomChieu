import JSZip from 'jszip';
import { Category, Article, Member, Coach, Achievement, Tournament, Club, Highlight, WebConfig } from './types';

export function generateSqlScript(
  categories: Category[],
  articles: Article[],
  members: Member[],
  coaches: Coach[],
  achievements: Achievement[],
  tournaments: Tournament[],
  clubs: Club[],
  highlights: Highlight[],
  webConfig: WebConfig
): string {
  let sql = `-- =========================================================\n`;
  sql += `-- SQL SERVER DATABASE INITIALIZATION SCRIPT FOR VOVINAM XOM CHIEU\n`;
  sql += `-- Generated on: ${new Date().toLocaleDateString('vi-VN')}\n`;
  sql += `-- Target: SQL Server 2016 or newer\n`;
  sql += `-- =========================================================\n\n`;

  sql += `CREATE DATABASE VovinamXomChieuDB;\nGO\n\nUSE VovinamXomChieuDB;\nGO\n\n`;

  // Create WebConfig table
  sql += `-- 1. Table WebConfig\n`;
  sql += `CREATE TABLE WebConfig (\n`;
  sql += `    ClbName NVARCHAR(250) NOT NULL,\n`;
  sql += `    Logo NVARCHAR(1000) NULL,\n`;
  sql += `    Address NVARCHAR(500) NOT NULL,\n`;
  sql += `    Phone NVARCHAR(100) NOT NULL,\n`;
  sql += `    Email NVARCHAR(100) NOT NULL,\n`;
  sql += `    Facebook NVARCHAR(500) NULL,\n`;
  sql += `    Instagram NVARCHAR(500) NULL,\n`;
  sql += `    Threads NVARCHAR(500) NULL,\n`;
  sql += `    Tiktok NVARCHAR(500) NULL,\n`;
  sql += `    FooterText NVARCHAR(1000) NULL,\n`;
  sql += `    SeoTitle NVARCHAR(250) NULL,\n`;
  sql += `    SeoDescription NVARCHAR(1000) NULL\n`;
  sql += `);\nGO\n\n`;

  // Create Categories table
  sql += `-- 2. Table Categories\n`;
  sql += `CREATE TABLE Categories (\n`;
  sql += `    Id NVARCHAR(50) PRIMARY KEY,\n`;
  sql += `    Name NVARCHAR(250) NOT NULL,\n`;
  sql += `    [Order] INT NOT NULL DEFAULT 0,\n`;
  sql += `    Status BIT NOT NULL DEFAULT 1,\n`;
  sql += `    Description NVARCHAR(1000) NULL\n`;
  sql += `);\nGO\n\n`;

  // Create Articles table (ID IDENTITY)
  sql += `-- 3. Table Articles\n`;
  sql += `CREATE TABLE Articles (\n`;
  sql += `    Id INT IDENTITY(1,1) PRIMARY KEY,\n`;
  sql += `    Image NVARCHAR(1000) NULL,\n`;
  sql += `    Title NVARCHAR(500) NOT NULL,\n`;
  sql += `    CategoryId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Categories(Id) ON DELETE CASCADE,\n`;
  sql += `    Content NVARCHAR(MAX) NOT NULL,\n`;
  sql += `    Date DATE NOT NULL DEFAULT GETDATE(),\n`;
  sql += `    Views INT NOT NULL DEFAULT 0,\n`;
  sql += `    Status BIT NOT NULL DEFAULT 1,\n`;
  sql += `    ShowInNews BIT NOT NULL DEFAULT 0\n`;
  sql += `);\nGO\n\n`;

  // Create Clubs table
  sql += `-- 4. Table Clubs\n`;
  sql += `CREATE TABLE Clubs (\n`;
  sql += `    Id NVARCHAR(50) PRIMARY KEY,\n`;
  sql += `    Image NVARCHAR(1000) NULL,\n`;
  sql += `    Name NVARCHAR(250) NOT NULL,\n`;
  sql += `    HeadCoach NVARCHAR(250) NOT NULL,\n`;
  sql += `    Address NVARCHAR(500) NOT NULL,\n`;
  sql += `    TrainingDays NVARCHAR(250) NOT NULL,\n`;
  sql += `    TrainingHours NVARCHAR(250) NOT NULL,\n`;
  sql += `    Status BIT NOT NULL DEFAULT 1\n`;
  sql += `);\nGO\n\n`;

  // Create Members table
  sql += `-- 5. Table Members\n`;
  sql += `CREATE TABLE Members (\n`;
  sql += `    Id NVARCHAR(50) PRIMARY KEY,\n`;
  sql += `    Photo NVARCHAR(1000) NULL,\n`;
  sql += `    FullName NVARCHAR(250) NOT NULL,\n`;
  sql += `    BirthYear INT NOT NULL,\n`;
  sql += `    Rank NVARCHAR(150) NOT NULL,\n`;
  sql += `    ClubId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Clubs(Id) ON DELETE CASCADE,\n`;
  sql += `    Status BIT NOT NULL DEFAULT 1\n`;
  sql += `);\nGO\n\n`;

  // Create Coaches table
  sql += `-- 6. Table Coaches\n`;
  sql += `CREATE TABLE Coaches (\n`;
  sql += `    Id NVARCHAR(50) PRIMARY KEY,\n`;
  sql += `    Photo NVARCHAR(1000) NULL,\n`;
  sql += `    FullName NVARCHAR(250) NOT NULL,\n`;
  sql += `    BirthYear INT NOT NULL,\n`;
  sql += `    Rank NVARCHAR(150) NOT NULL,\n`;
  sql += `    ClubId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Clubs(Id) ON DELETE CASCADE,\n`;
  sql += `    Experience NVARCHAR(MAX) NULL,\n`;
  sql += `    Status BIT NOT NULL DEFAULT 1\n`;
  sql += `);\nGO\n\n`;

  // Create Achievements table
  sql += `-- 7. Table Achievements\n`;
  sql += `CREATE TABLE Achievements (\n`;
  sql += `    Id NVARCHAR(50) PRIMARY KEY,\n`;
  sql += `    Image NVARCHAR(1000) NULL,\n`;
  sql += `    Title NVARCHAR(250) NOT NULL,\n`;
  sql += `    Unit NVARCHAR(250) NOT NULL,\n`;
  sql += `    MedalType NVARCHAR(50) NOT NULL,\n`;
  sql += `    Date DATE NOT NULL,\n`;
  sql += `    Status BIT NOT NULL DEFAULT 1\n`;
  sql += `);\nGO\n\n`;

  // Create Tournaments table
  sql += `-- 8. Table Tournaments\n`;
  sql += `CREATE TABLE Tournaments (\n`;
  sql += `    Id NVARCHAR(50) PRIMARY KEY,\n`;
  sql += `    Image NVARCHAR(1000) NULL,\n`;
  sql += `    Name NVARCHAR(250) NOT NULL,\n`;
  sql += `    Date NVARCHAR(250) NOT NULL,\n`;
  sql += `    Location NVARCHAR(500) NOT NULL,\n`;
  sql += `    Status NVARCHAR(50) NOT NULL -- 'đang diễn ra', 'sắp diễn ra', 'đã kết thúc'\n`;
  sql += `);\nGO\n\n`;

  // Create Highlights table
  sql += `-- 9. Table Highlights\n`;
  sql += `CREATE TABLE Highlights (\n`;
  sql += `    Id NVARCHAR(50) PRIMARY KEY,\n`;
  sql += `    Thumbnail NVARCHAR(1000) NULL,\n`;
  sql += `    Title NVARCHAR(500) NOT NULL,\n`;
  sql += `    AthleteName NVARCHAR(250) NOT NULL,\n`;
  sql += `    MediaType NVARCHAR(50) NOT NULL, -- 'video' hoặc 'ảnh'\n`;
  sql += `    Status BIT NOT NULL DEFAULT 1\n`;
  sql += `);\nGO\n\n`;

  // Create HighlightMedias table for multiple images/videos
  sql += `-- 10. Table HighlightMedias (Many-to-One with Highlights)\n`;
  sql += `CREATE TABLE HighlightMedias (\n`;
  sql += `    Id INT IDENTITY(1,1) PRIMARY KEY,\n`;
  sql += `    HighlightId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Highlights(Id) ON DELETE CASCADE,\n`;
  sql += `    MediaUrl NVARCHAR(1000) NOT NULL\n`;
  sql += `);\nGO\n\n`;

  // --- SEED DATA ---
  sql += `-- ========================================== \n`;
  sql += `-- SEED INITIAL DATA\n`;
  sql += `-- ========================================== \n\n`;

  // WebConfig Seed
  const wc = webConfig;
  sql += `INSERT INTO WebConfig (ClbName, Logo, Address, Phone, Email, Facebook, Instagram, Threads, Tiktok, FooterText, SeoTitle, SeoDescription)\nVALUES (`;
  sql += `N'${wc.clbName.replace(/'/g, "''")}', N'${wc.logo}', N'${wc.address.replace(/'/g, "''")}', N'${wc.phone}', '${wc.email}', `;
  sql += `'${wc.facebook}', '${wc.instagram}', '${wc.threads}', '${wc.tiktok}', `;
  sql += `N'${wc.footerText.replace(/'/g, "''")}', N'${wc.seoTitle.replace(/'/g, "''")}', N'${wc.seoDescription.replace(/'/g, "''")}'`;
  sql += `);\nGO\n\n`;

  // Categories Seed
  categories.forEach(c => {
    sql += `INSERT INTO Categories (Id, Name, [Order], Status, Description)\nVALUES (`;
    sql += `'${c.id}', N'${c.name.replace(/'/g, "''")}', ${c.order}, ${c.status ? 1 : 0}, N'${c.description.replace(/'/g, "''")}'`;
    sql += `);\n`;
  });
  sql += `GO\n\n`;

  // Clubs Seed
  clubs.forEach(club => {
    sql += `INSERT INTO Clubs (Id, Image, Name, HeadCoach, Address, TrainingDays, TrainingHours, Status)\nVALUES (`;
    sql += `'${club.id}', '${club.image}', N'${club.name.replace(/'/g, "''")}', N'${club.headCoach.replace(/'/g, "''")}', N'${club.address.replace(/'/g, "''")}', N'${club.trainingDays.replace(/'/g, "''")}', N'${club.trainingHours.replace(/'/g, "''")}', ${club.status ? 1 : 0}`;
    sql += `);\n`;
  });
  sql += `GO\n\n`;

  // Members Seed
  members.forEach(m => {
    sql += `INSERT INTO Members (Id, Photo, FullName, BirthYear, Rank, ClubId, Status)\nVALUES (`;
    sql += `'${m.id}', '${m.photo}', N'${m.fullName.replace(/'/g, "''")}', ${m.birthYear}, N'${m.rank.replace(/'/g, "''")}', '${m.clubId}', ${m.status ? 1 : 0}`;
    sql += `);\n`;
  });
  sql += `GO\n\n`;

  // Coaches Seed
  coaches.forEach(ch => {
    sql += `INSERT INTO Coaches (Id, Photo, FullName, BirthYear, Rank, ClubId, Experience, Status)\nVALUES (`;
    sql += `'${ch.id}', '${ch.photo}', N'${ch.fullName.replace(/'/g, "''")}', ${ch.birthYear}, N'${ch.rank.replace(/'/g, "''")}', '${ch.clubId}', N'${ch.experience.replace(/'/g, "''")}', ${ch.status ? 1 : 0}`;
    sql += `);\n`;
  });
  sql += `GO\n\n`;

  // Achievements Seed
  achievements.forEach(a => {
    sql += `INSERT INTO Achievements (Id, Image, Title, Unit, MedalType, Date, Status)\nVALUES (`;
    sql += `'${a.id}', '${a.image}', N'${a.title.replace(/'/g, "''")}', N'${a.unit.replace(/'/g, "''")}', N'${a.medalType}', '${a.date}', ${a.status ? 1 : 0}`;
    sql += `);\n`;
  });
  sql += `GO\n\n`;

  // Tournaments Seed
  tournaments.forEach(t => {
    sql += `INSERT INTO Tournaments (Id, Image, Name, Date, Location, Status)\nVALUES (`;
    sql += `'${t.id}', '${t.image}', N'${t.name.replace(/'/g, "''")}', N'${t.date.replace(/'/g, "''")}', N'${t.location.replace(/'/g, "''")}', N'${t.status}'`;
    sql += `);\n`;
  });
  sql += `GO\n\n`;

  // Highlights Seed
  highlights.forEach(h => {
    sql += `INSERT INTO Highlights (Id, Thumbnail, Title, AthleteName, MediaType, Status)\nVALUES (`;
    sql += `'${h.id}', '${h.thumbnail}', N'${h.title.replace(/'/g, "''")}', N'${h.athleteName.replace(/'/g, "''")}', N'${h.mediaType}', ${h.status ? 1 : 0}`;
    sql += `);\n`;

    // HighlightMedias Seed
    h.mediaUrls.forEach(url => {
      sql += `INSERT INTO HighlightMedias (HighlightId, MediaUrl) VALUES ('${h.id}', '${url}');\n`;
    });
  });
  sql += `GO\n\n`;

  // Articles Seed
  articles.forEach(art => {
    sql += `INSERT INTO Articles (Image, Title, CategoryId, Content, Date, Views, Status, ShowInNews)\nVALUES (`;
    sql += `'${art.image}', N'${art.title.replace(/'/g, "''")}', '${art.categoryId}', N'${art.content.replace(/'/g, "''")}', '${art.date}', ${art.views}, ${art.status ? 1 : 0}, ${art.showInNews ? 1 : 0}`;
    sql += `);\n`;
  });
  sql += `GO\n`;

  return sql;
}

export async function downloadAspNetAndSqlZip(
  categories: Category[],
  articles: Article[],
  members: Member[],
  coaches: Coach[],
  achievements: Achievement[],
  tournaments: Tournament[],
  clubs: Club[],
  highlights: Highlight[],
  webConfig: WebConfig
): Promise<Blob> {
  const zip = new JSZip();

  // Root folder
  const slnContent = `
Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 17
VisualStudioVersion = 17.0.31903.59
MinimumVisualStudioVersion = 10.0.40219.1
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "VovinamXomChieu.Web", "VovinamXomChieu.Web\\VovinamXomChieu.Web.csproj", "{A8712C12-3D28-4BF2-A6EA-B4DE1500FF2A}"
EndProject
Global
	GlobalSection(SolutionConfigurationPlatforms) = preSolution
		Debug|Any CPU = Debug|Any CPU
		Release|Any CPU = Release|Any CPU
	EndGlobalSection
	GlobalSection(ProjectConfigurationPlatforms) = postSolution
		{A8712C12-3D28-4BF2-A6EA-B4DE1500FF2A}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
		{A8712C12-3D28-4BF2-A6EA-B4DE1500FF2A}.Debug|Any CPU.Build.0 = Debug|Any CPU
		{A8712C12-3D28-4BF2-A6EA-B4DE1500FF2A}.Release|Any CPU.ActiveCfg = Release|Any CPU
		{A8712C12-3D28-4BF2-A6EA-B4DE1500FF2A}.Release|Any CPU.Build.0 = Release|Any CPU
	EndGlobalSection
EndGlobal
  `.trim();

  zip.file('VovinamXomChieu.sln', slnContent);

  // Generate and save SQL file in root
  const sqlScript = generateSqlScript(categories, articles, members, coaches, achievements, tournaments, clubs, highlights, webConfig);
  zip.file('VovinamXomChieu.sql', sqlScript);

  // Web project directory
  const webFolder = zip.folder('VovinamXomChieu.Web')!;

  // csproj
  const csprojContent = `
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.2" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.0.2">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
    <PackageReference Include="Microsoft.VisualStudio.Web.CodeGeneration.Design" Version="8.0.1" />
  </ItemGroup>

</Project>
  `.trim();
  webFolder.file('VovinamXomChieu.Web.csproj', csprojContent);

  // appsettings.json
  const appSettingsContent = JSON.stringify({
    Logging: {
      LogLevel: {
        Default: "Information",
        "Microsoft.AspNetCore": "Warning"
      }
    },
    AllowedHosts: "*",
    ConnectionStrings: {
      DefaultConnection: "Server=(localdb)\\MSSQLLocalDB;Database=VovinamXomChieuDB;Trusted_Connection=True;MultipleActiveResultSets=true"
    }
  }, null, 2);
  webFolder.file('appsettings.json', appSettingsContent);

  // Models directory
  const modelsFolder = webFolder.folder('Models')!;

  // Models/Category.cs
  modelsFolder.file('Category.cs', `
using System.ComponentModel.DataAnnotations;

namespace VovinamXomChieu.Web.Models
{
    public class Category
    {
        [Key]
        [Required]
        [StringLength(50)]
        public string Id { get; set; } = string.Empty;

        [Required]
        [StringLength(250)]
        public string Name { get; set; } = string.Empty;

        public int Order { get; set; } = 0;

        public bool Status { get; set; } = true;

        [StringLength(1000)]
        public string? Description { get; set; }

        public ICollection<Article> Articles { get; set; } = new List<Article>();
    }
}
  `.trim());

  // Models/Article.cs
  modelsFolder.file('Article.cs', `
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VovinamXomChieu.Web.Models
{
    public class Article
    {
        [Key]
        public int Id { get; set; }

        [StringLength(1000)]
        public string? Image { get; set; }

        [Required]
        [StringLength(500)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string CategoryId { get; set; } = string.Empty;

        [ForeignKey("CategoryId")]
        public Category? Category { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        public DateTime Date { get; set; } = DateTime.Now;

        public int Views { get; set; } = 0;

        public bool Status { get; set; } = true;

        public bool ShowInNews { get; set; } = false;
    }
}
  `.trim());

  // Models/Club.cs
  modelsFolder.file('Club.cs', `
using System.ComponentModel.DataAnnotations;

namespace VovinamXomChieu.Web.Models
{
    public class Club
    {
        [Key]
        [StringLength(50)]
        public string Id { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Image { get; set; }

        [Required]
        [StringLength(250)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(250)]
        public string HeadCoach { get; set; } = string.Empty;

        [Required]
        [StringLength(500)]
        public string Address { get; set; } = string.Empty;

        [Required]
        [StringLength(250)]
        public string TrainingDays { get; set; } = string.Empty;

        [Required]
        [StringLength(250)]
        public string TrainingHours { get; set; } = string.Empty;

        public bool Status { get; set; } = true;
    }
}
  `.trim());

  // Models/Member.cs
  modelsFolder.file('Member.cs', `
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VovinamXomChieu.Web.Models
{
    public class Member
    {
        [Key]
        [StringLength(50)]
        public string Id { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Photo { get; set; }

        [Required]
        [StringLength(250)]
        public string FullName { get; set; } = string.Empty;

        public int BirthYear { get; set; }

        [Required]
        [StringLength(150)]
        public string Rank { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string ClubId { get; set; } = string.Empty;

        [ForeignKey("ClubId")]
        public Club? Club { get; set; }

        public bool Status { get; set; } = true;
    }
}
  `.trim());

  // Models/Coach.cs
  modelsFolder.file('Coach.cs', `
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VovinamXomChieu.Web.Models
{
    public class Coach
    {
        [Key]
        [StringLength(50)]
        public string Id { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Photo { get; set; }

        [Required]
        [StringLength(250)]
        public string FullName { get; set; } = string.Empty;

        public int BirthYear { get; set; }

        [Required]
        [StringLength(150)]
        public string Rank { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string ClubId { get; set; } = string.Empty;

        [ForeignKey("ClubId")]
        public Club? Club { get; set; }

        public string? Experience { get; set; }

        public bool Status { get; set; } = true;
    }
}
  `.trim());

  // Models/Achievement.cs
  modelsFolder.file('Achievement.cs', `
using System;
using System.ComponentModel.DataAnnotations;

namespace VovinamXomChieu.Web.Models
{
    public class Achievement
    {
        [Key]
        [StringLength(50)]
        public string Id { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Image { get; set; }

        [Required]
        [StringLength(250)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(250)]
        public string Unit { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string MedalType { get; set; } = "Khác"; // Vàng, Bạc, Đồng, Khác

        public DateTime Date { get; set; } = DateTime.Now;

        public bool Status { get; set; } = true;
    }
}
  `.trim());

  // Models/Tournament.cs
  modelsFolder.file('Tournament.cs', `
using System.ComponentModel.DataAnnotations;

namespace VovinamXomChieu.Web.Models
{
    public class Tournament
    {
        [Key]
        [StringLength(50)]
        public string Id { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Image { get; set; }

        [Required]
        [StringLength(250)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(250)]
        public string Date { get; set; } = string.Empty;

        [Required]
        [StringLength(500)]
        public string Location { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "sắp diễn ra"; // đang diễn ra, sắp diễn ra, đã kết thúc
    }
}
  `.trim());

  // Models/Highlight.cs
  modelsFolder.file('Highlight.cs', `
using System.ComponentModel.DataAnnotations;

namespace VovinamXomChieu.Web.Models
{
    public class Highlight
    {
        [Key]
        [StringLength(50)]
        public string Id { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Thumbnail { get; set; }

        [Required]
        [StringLength(500)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(250)]
        public string AthleteName { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string MediaType { get; set; } = "video"; // video, ảnh

        public bool Status { get; set; } = true;

        public ICollection<HighlightMedia> MediaUrls { get; set; } = new List<HighlightMedia>();
    }
}
  `.trim());

  // Models/HighlightMedia.cs
  modelsFolder.file('HighlightMedia.cs', `
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VovinamXomChieu.Web.Models
{
    public class HighlightMedia
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string HighlightId { get; set; } = string.Empty;

        [ForeignKey("HighlightId")]
        public Highlight? Highlight { get; set; }

        [Required]
        [StringLength(1000)]
        public string MediaUrl { get; set; } = string.Empty;
    }
}
  `.trim());

  // Models/WebConfig.cs
  modelsFolder.file('WebConfig.cs', `
using System.ComponentModel.DataAnnotations;

namespace VovinamXomChieu.Web.Models
{
    public class WebConfig
    {
        [Key]
        [Required]
        [StringLength(250)]
        public string ClbName { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Logo { get; set; }

        [Required]
        [StringLength(500)]
        public string Address { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Phone { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Facebook { get; set; }

        [StringLength(500)]
        public string? Instagram { get; set; }

        [StringLength(500)]
        public string? Threads { get; set; }

        [StringLength(500)]
        public string? Tiktok { get; set; }

        [StringLength(1000)]
        public string? FooterText { get; set; }

        [StringLength(250)]
        public string? SeoTitle { get; set; }

        [StringLength(1000)]
        public string? SeoDescription { get; set; }
    }
}
  `.trim());

  // Data folder
  const dataFolder = webFolder.folder('Data')!;

  // Data/VovinamDbContext.cs
  dataFolder.file('VovinamDbContext.cs', `
using Microsoft.EntityFrameworkCore;
using VovinamXomChieu.Web.Models;

namespace VovinamXomChieu.Web.Data
{
    public class VovinamDbContext : DbContext
    {
        public VovinamDbContext(DbContextOptions<VovinamDbContext> options) : base(options)
        {
        }

        public DbSet<WebConfig> WebConfigs { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Article> Articles { get; set; }
        public DbSet<Club> Clubs { get; set; }
        public DbSet<Member> Members { get; set; }
        public DbSet<Coach> Coaches { get; set; }
        public DbSet<Achievement> Achievements { get; set; }
        public DbSet<Tournament> Tournaments { get; set; }
        public DbSet<Highlight> Highlights { get; set; }
        public DbSet<HighlightMedia> HighlightMedias { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure WebConfig primary keyless or fake key
            modelBuilder.Entity<WebConfig>().HasKey(w => w.ClbName);

            // Cascade deletes or custom configurations
            modelBuilder.Entity<Article>()
                .HasOne(a => a.Category)
                .WithMany(c => c.Articles)
                .HasForeignKey(a => a.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<HighlightMedia>()
                .HasOne(hm => hm.Highlight)
                .WithMany(h => h.MediaUrls)
                .HasForeignKey(hm => hm.HighlightId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
  `.trim());

  // Controllers folder
  const controllersFolder = webFolder.folder('Controllers')!;

  // Controllers/HomeController.cs
  controllersFolder.file('HomeController.cs', `
using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VovinamXomChieu.Web.Data;
using VovinamXomChieu.Web.Models;

namespace VovinamXomChieu.Web.Controllers
{
    public class HomeController : Controller
    {
        private readonly VovinamDbContext _context;

        public HomeController(VovinamDbContext context)
        {
            _context = context;
        }

        public async Task<IActionResult> Index()
        {
            var webConfig = await _context.WebConfigs.FirstOrDefaultAsync() ?? new WebConfig 
            { 
                ClbName = "Vovinam Xóm Chiếu", 
                Address = "Xóm Chiếu, Quận 4, TP.HCM",
                Phone = "090000000",
                Email = "contact@vovinam.com"
            };
            ViewBag.WebConfig = webConfig;

            var articles = await _context.Articles.Where(a => a.Status).OrderByDescending(a => a.Date).Take(3).ToListAsync();
            var tournaments = await _context.Tournaments.ToListAsync();
            var highlights = await _context.Highlights.Include(h => h.MediaUrls).Where(h => h.Status).Take(6).ToListAsync();
            var achievements = await _context.Achievements.Where(a => a.Status).OrderByDescending(a => a.Date).Take(6).ToListAsync();
            var coaches = await _context.Coaches.Where(c => c.Status).ToListAsync();
            var members = await _context.Members.Where(m => m.Status).ToListAsync();
            var clubs = await _context.Clubs.Where(c => c.Status).ToListAsync();

            ViewBag.Articles = articles;
            ViewBag.Tournaments = tournaments;
            ViewBag.Highlights = highlights;
            ViewBag.Achievements = achievements;
            ViewBag.Coaches = coaches;
            ViewBag.Members = members;
            ViewBag.Clubs = clubs;

            return View();
        }

        public async Task<IActionResult> ArticleDetail(int id)
        {
            var article = await _context.Articles.Include(a => a.Category).FirstOrDefaultAsync(a => a.Id == id);
            if (article == null) return NotFound();

            // Increment views
            article.Views++;
            await _context.SaveChangesAsync();

            var webConfig = await _context.WebConfigs.FirstOrDefaultAsync();
            ViewBag.WebConfig = webConfig;

            // Related articles
            ViewBag.RelatedArticles = await _context.Articles
                .Where(a => a.Status && a.CategoryId == article.CategoryId && a.Id != article.Id)
                .Take(3)
                .ToListAsync();

            return View(article);
        }

        public async Task<IActionResult> HighlightDetail(string id)
        {
            var highlight = await _context.Highlights.Include(h => h.MediaUrls).FirstOrDefaultAsync(h => h.Id == id);
            if (highlight == null) return NotFound();

            var webConfig = await _context.WebConfigs.FirstOrDefaultAsync();
            ViewBag.WebConfig = webConfig;

            return View(highlight);
        }

        public async Task<IActionResult> ClubDetail(string id)
        {
            var club = await _context.Clubs.FirstOrDefaultAsync(c => c.Id == id);
            if (club == null) return NotFound();

            var webConfig = await _context.WebConfigs.FirstOrDefaultAsync();
            ViewBag.WebConfig = webConfig;

            return View(club);
        }
    }
}
  `.trim());

  // Program.cs
  const programCsContent = `
using Microsoft.EntityFrameworkCore;
using VovinamXomChieu.Web.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

builder.Services.AddDbContext<VovinamDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
  `.trim();
  webFolder.file('Program.cs', programCsContent);

  // Properties folder for Launch Settings
  const propertiesFolder = webFolder.folder('Properties')!;
  propertiesFolder.file('launchSettings.json', JSON.stringify({
    iisSettings: {
      windowsAuthentication: false,
      anonymousAuthentication: true,
      iisExpress: {
        applicationUrl: "http://localhost:52423",
        sslPort: 44321
      }
    },
    profiles: {
      http: {
        commandName: "Project",
        launchBrowser: true,
        environmentVariables: {
          ASPNETCORE_ENVIRONMENT: "Development"
        },
        applicationUrl: "http://localhost:5243"
      },
      https: {
        commandName: "Project",
        launchBrowser: true,
        environmentVariables: {
          ASPNETCORE_ENVIRONMENT: "Development"
        },
        applicationUrl: "https://localhost:7243;http://localhost:5243"
      },
      "IIS Express": {
        commandName: "IISExpress",
        launchBrowser: true,
        environmentVariables: {
          ASPNETCORE_ENVIRONMENT: "Development"
        }
      }
    }
  }, null, 2));

  // Views folder
  const viewsFolder = webFolder.folder('Views')!;
  
  viewsFolder.file('_ViewStart.cshtml', `
@{
    Layout = "_Layout";
}
  `.trim());

  viewsFolder.file('_ViewImports.cshtml', `
@using VovinamXomChieu.Web
@using VovinamXomChieu.Web.Models
@addTagHelper *, Microsoft.AspNetCore.Mvc.TagHelpers
  `.trim());

  // Views/Shared
  const viewsSharedFolder = viewsFolder.folder('Shared')!;
  viewsSharedFolder.file('_Layout.cshtml', `
@using VovinamXomChieu.Web.Models
@{
    var webConfig = ViewBag.WebConfig as WebConfig ?? new WebConfig 
    { 
        ClbName = "Vovinam Xóm Chiếu", 
        Address = "Xóm Chiếu, Quận 4, TP.HCM",
        Phone = "090000000",
        Email = "contact@vovinam.com",
        FooterText = "© 2026 Vovinam Xóm Chiếu. Tất cả quyền được bảo lưu."
    };
}
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>@(webConfig.SeoTitle ?? webConfig.ClbName)</title>
    <meta name="description" content="@(webConfig.SeoDescription ?? "Website CLB Vovinam Xóm Chiếu")" />
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>
        body {
            font-family: 'Inter', sans-serif;
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col">
    <header class="bg-gradient-to-r from-blue-700 via-blue-800 to-amber-500 text-white shadow-md sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16 sm:h-20">
                <a href="/" class="flex items-center gap-3">
                    @if (!string.IsNullOrEmpty(webConfig.Logo))
                    {
                        <img src="@webConfig.Logo" alt="Logo" class="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-white bg-white" />
                    }
                    else
                    {
                        <div class="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center font-bold text-lg sm:text-xl text-blue-900">V</div>
                    }
                    <div>
                        <h1 class="font-extrabold text-base sm:text-xl tracking-tight leading-none">@webConfig.ClbName</h1>
                        <p class="text-[10px] sm:text-xs text-blue-100 font-medium tracking-wider uppercase mt-1">Việt Võ Đạo - Nhân Bản - Nghĩa Khí</p>
                    </div>
                </a>
                <nav class="hidden md:flex space-x-6 text-sm font-semibold">
                    <a href="/" class="hover:text-amber-200 transition-colors">Trang Chủ</a>
                    <a href="#about" class="hover:text-amber-200 transition-colors">Giới Thiệu</a>
                    <a href="#coaches" class="hover:text-amber-200 transition-colors">Huấn Luyện Viên</a>
                    <a href="#clubs" class="hover:text-amber-200 transition-colors">Sân Tập</a>
                    <a href="#highlights" class="hover:text-amber-200 transition-colors">Khoảnh Khắc</a>
                    <a href="#achievements" class="hover:text-amber-200 transition-colors">Thành Tích</a>
                </nav>
            </div>
        </div>
    </header>

    <main class="flex-grow">
        @RenderBody()
    </main>

    <footer class="bg-slate-900 text-slate-300 border-t border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                    <h3 class="text-white font-bold text-lg mb-4">@webConfig.ClbName</h3>
                    <p class="text-sm text-slate-400 mb-4">Môn phái Vovinam Việt Võ Đạo mang lại sức khỏe, đạo đức và tinh thần võ sỹ đạo nhân bản.</p>
                    <div class="flex space-x-4">
                        @if (!string.IsNullOrEmpty(webConfig.Facebook))
                        {
                            <a href="@webConfig.Facebook" target="_blank" class="text-slate-400 hover:text-blue-500 transition-colors"><i class="fab fa-facebook-f text-lg"></i></a>
                        }
                        @if (!string.IsNullOrEmpty(webConfig.Instagram))
                        {
                            <a href="@webConfig.Instagram" target="_blank" class="text-slate-400 hover:text-pink-500 transition-colors"><i class="fab fa-instagram text-lg"></i></a>
                        }
                        @if (!string.IsNullOrEmpty(webConfig.Tiktok))
                        {
                            <a href="@webConfig.Tiktok" target="_blank" class="text-slate-400 hover:text-white transition-colors"><i class="fab fa-tiktok text-lg"></i></a>
                        }
                    </div>
                </div>
                <div>
                    <h3 class="text-white font-bold text-lg mb-4">Liên Hệ</h3>
                    <ul class="space-y-3 text-sm">
                        <li class="flex items-start gap-2">
                            <i class="fas fa-map-marker-alt text-amber-500 mt-1"></i>
                            <span>@webConfig.Address</span>
                        </li>
                        <li class="flex items-center gap-2">
                            <i class="fas fa-phone-alt text-amber-500"></i>
                            <span>@webConfig.Phone</span>
                        </li>
                        <li class="flex items-center gap-2">
                            <i class="fas fa-envelope text-amber-500"></i>
                            <span>@webConfig.Email</span>
                        </li>
                    </ul>
                </div>
                <div>
                    <h3 class="text-white font-bold text-lg mb-4">Liên Kết Nhanh</h3>
                    <ul class="space-y-2 text-sm text-slate-400">
                        <li><a href="/" class="hover:text-amber-500 transition-colors">Về trang chủ</a></li>
                        <li><a href="#about" class="hover:text-amber-500 transition-colors">Về chúng tôi</a></li>
                        <li><a href="#clubs" class="hover:text-amber-500 transition-colors">Danh sách các sân tập</a></li>
                    </ul>
                </div>
            </div>
            <div class="border-t border-slate-800 mt-12 pt-8 text-center text-xs text-slate-500">
                <p>@webConfig.FooterText</p>
                <p class="mt-2">Hệ thống quản lý CLB Vovinam - Phát triển trên nền tảng ASP.NET Core MVC & SQL Server</p>
            </div>
        </div>
    </footer>
</body>
</html>
  `.trim());

  // Views/Home
  const viewsHomeFolder = viewsFolder.folder('Home')!;
  
  viewsHomeFolder.file('Index.cshtml', `
@using VovinamXomChieu.Web.Models
@{
    var articles = ViewBag.Articles as List<Article> ?? new List<Article>();
    var tournaments = ViewBag.Tournaments as List<Tournament> ?? new List<Tournament>();
    var highlights = ViewBag.Highlights as List<Highlight> ?? new List<Highlight>();
    var achievements = ViewBag.Achievements as List<Achievement> ?? new List<Achievement>();
    var coaches = ViewBag.Coaches as List<Coach> ?? new List<Coach>();
    var members = ViewBag.Members as List<Member> ?? new List<Member>();
    var clubs = ViewBag.Clubs as List<Club> ?? new List<Club>();
    var webConfig = ViewBag.WebConfig as WebConfig;
}

<!-- Hero Section -->
<section class="relative bg-slate-900 text-white overflow-hidden py-16 sm:py-24">
    <div class="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center"></div>
    <div class="absolute inset-0 bg-gradient-to-b from-blue-900/60 to-slate-900"></div>
    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-widest mb-4">CLB Vovinam Việt Võ Đạo</span>
        <h2 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
            BẢN LĨNH & <span class="text-amber-400">NGHĨA KHÍ</span>
        </h2>
        <p class="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 mb-8 leading-relaxed">
            Rèn luyện thân thể khoẻ mạnh - Trau dồi tâm chí sáng suốt - Phát huy tinh thần thượng võ phục vụ con người và xã hội.
        </p>
        <div class="flex flex-wrap justify-center gap-4">
            <a href="#clubs" class="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-lg hover:shadow-amber-500/20 transition-all">Danh Sách Sân Tập</a>
            <a href="#about" class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg border border-slate-700 transition-all">Tìm Hiểu Thêm</a>
        </div>
    </div>
</section>

<!-- About / Welcome Section -->
<section id="about" class="py-16 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
                <span class="text-xs font-bold text-blue-600 uppercase tracking-widest">Giới thiệu CLB</span>
                <h3 class="text-3xl font-bold text-slate-900 mt-2 mb-6">Môn phái võ thuật tự hào của người Việt Nam</h3>
                <p class="text-slate-600 leading-relaxed mb-4">
                    Vovinam (Việt Võ Đạo) được sáng lập bởi Sáng tổ Nguyễn Lộc vào năm 1938. Hệ thống võ thuật toàn diện kết hợp giữa cương và nhu, nổi tiếng with các đòn chân tấn công kẹp cổ đặc trưng cùng triết lý sống cao đẹp.
                </p>
                <p class="text-slate-600 leading-relaxed mb-6">
                    Tại CLB của chúng tôi, học viên được rèn luyện bài bản từ kỹ thuật căn bản, các bài quyền, tự vệ, khóa gỡ đến võ thuật đối kháng và tinh thần võ đạo nhân văn, bác ái.
                </p>
                <div class="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                    <div>
                        <span class="block text-2xl font-extrabold text-blue-600">@clubs.Count</span>
                        <span class="text-xs text-slate-500 font-medium">Sân Tập Đang Hoạt Động</span>
                    </div>
                    <div>
                        <span class="block text-2xl font-extrabold text-amber-500">@coaches.Count</span>
                        <span class="text-xs text-slate-500 font-medium">Huấn Luyện Viên</span>
                    </div>
                    <div>
                        <span class="block text-2xl font-extrabold text-teal-500">@members.Count+</span>
                        <span class="text-xs text-slate-500 font-medium">Võ Sinh Đăng Ký</span>
                    </div>
                </div>
            </div>
            <div class="relative">
                <div class="aspect-video rounded-2xl overflow-hidden shadow-xl">
                    <img src="https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80" alt="Vovinam" class="w-full h-full object-cover" />
                </div>
                <div class="absolute -bottom-6 -left-6 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 p-6 rounded-2xl shadow-lg hidden sm:block max-w-[240px]">
                    <i class="fas fa-quote-left text-3xl opacity-20 mb-2"></i>
                    <p class="text-sm font-bold leading-tight">"Sống cho mình, giúp người khác sống, và sống cho mọi người."</p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Clubs Section -->
<section id="clubs" class="py-16 bg-slate-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-12">
            <span class="text-xs font-bold text-blue-600 uppercase tracking-widest">Nơi Tập Luyện</span>
            <h3 class="text-3xl font-bold text-slate-900 mt-2 mb-4">Các Sân Tập & Chi Nhánh</h3>
            <p class="text-slate-600 text-sm sm:text-base">Hệ thống phòng tập, sân tập Vovinam khang trang, sạch sẽ với đội ngũ HLV tâm huyết.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            @foreach (var club in clubs)
            {
                <div class="bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-100 overflow-hidden transition-all flex flex-col h-full">
                    <div class="h-48 relative overflow-hidden bg-slate-100">
                        @if (!string.IsNullOrEmpty(club.Image))
                        {
                            <img src="@club.Image" alt="@club.Name" class="w-full h-full object-cover" />
                        }
                        else
                        {
                            <div class="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500"><i class="fas fa-map-marked-alt text-4xl"></i></div>
                        }
                        <div class="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">Đang hoạt động</div>
                    </div>
                    <div class="p-6 flex-1 flex flex-col justify-between">
                        <div>
                            <h4 class="font-bold text-lg text-slate-900 mb-2">@club.Name</h4>
                            <p class="text-xs text-slate-500 flex items-center gap-2 mb-3"><i class="fas fa-map-marker-alt text-slate-400"></i> @club.Address</p>
                            <p class="text-xs text-slate-600 flex items-center gap-2 mb-2"><i class="fas fa-user-shield text-slate-400"></i> <strong class="text-slate-700">HLV trưởng:</strong> @club.HeadCoach</p>
                            <p class="text-xs text-slate-600 flex items-center gap-2 mb-2"><i class="fas fa-calendar-alt text-slate-400"></i> <strong class="text-slate-700">Lịch tập:</strong> @club.TrainingDays</p>
                            <p class="text-xs text-slate-600 flex items-center gap-2 mb-2"><i class="fas fa-clock text-slate-400"></i> <strong class="text-slate-700">Giờ tập:</strong> @club.TrainingHours</p>
                        </div>
                        <div class="mt-6 pt-4 border-t border-slate-100">
                            <a href="/Home/ClubDetail/@club.Id" class="block text-center text-xs font-bold bg-slate-100 hover:bg-blue-600 hover:text-white text-blue-600 py-2.5 rounded-lg transition-all">Chi Tiết Sân Tập</a>
                        </div>
                    </div>
                </div>
            }
        </div>
    </div>
</section>

<!-- Coaches Section -->
<section id="coaches" class="py-16 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-12">
            <span class="text-xs font-bold text-blue-600 uppercase tracking-widest">Hội Đồng Võ Sư</span>
            <h3 class="text-3xl font-bold text-slate-900 mt-2 mb-4">Đội Ngũ Huấn Luyện Viên</h3>
            <p class="text-slate-600 text-sm sm:text-base">Những võ sư, huấn luyện viên có trình độ chuyên môn cao, giàu kinh nghiệm giảng dạy.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            @foreach (var coach in coaches)
            {
                <div class="bg-slate-50 rounded-xl p-5 border border-slate-100 text-center flex flex-col items-center shadow-sm hover:shadow-md transition-all">
                    <div class="h-28 w-28 rounded-full overflow-hidden bg-slate-200 border-2 border-amber-500 mb-4 shadow-sm">
                        @if (!string.IsNullOrEmpty(coach.Photo))
                        {
                            <img src="@coach.Photo" alt="@coach.FullName" class="w-full h-full object-cover" />
                        }
                        else
                        {
                            <div class="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-xl font-bold"><i class="fas fa-user-tie"></i></div>
                        }
                    </div>
                    <h4 class="font-bold text-slate-900">@coach.FullName</h4>
                    <span class="inline-block text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 rounded-full px-2.5 py-0.5 mt-1">@coach.Rank</span>
                    <p class="text-xs text-slate-500 mt-2">Kinh nghiệm: @coach.Experience</p>
                </div>
            }
        </div>
    </div>
</section>

<!-- Highlights Gallery Section -->
<section id="highlights" class="py-16 bg-slate-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-12">
            <span class="text-xs font-bold text-blue-600 uppercase tracking-widest">Thư Viện Ảnh & Video</span>
            <h3 class="text-3xl font-bold text-slate-900 mt-2 mb-4">Khoảnh Khắc Vovinam</h3>
            <p class="text-slate-600 text-sm sm:text-base">Ghi lại những khoảnh khắc đẹp trong tập luyện, thi đấu và sinh hoạt CLB.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            @foreach (var hl in highlights)
            {
                <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 group">
                    <div class="aspect-video relative overflow-hidden bg-slate-200">
                        @if (!string.IsNullOrEmpty(hl.Thumbnail))
                        {
                            <img src="@hl.Thumbnail" alt="@hl.Title" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                        }
                        else
                        {
                            <div class="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500"><i class="fas fa-photo-film text-4xl"></i></div>
                        }
                        <div class="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span class="h-12 w-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg"><i class="fas fa-expand text-lg"></i></span>
                        </div>
                        <span class="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                            <i class="@(hl.MediaType == "video" ? "fas fa-play text-[8px] mr-1" : "fas fa-image mr-1")"></i> @hl.MediaType
                        </span>
                    </div>
                    <div class="p-5">
                        <h4 class="font-bold text-slate-900 text-sm line-clamp-1">@hl.Title</h4>
                        <p class="text-xs text-slate-500 mt-1 flex items-center gap-1"><i class="fas fa-running text-slate-400"></i> Võ sinh: @hl.AthleteName</p>
                        <div class="mt-4 pt-3 border-t border-slate-50 flex justify-end">
                            <a href="/Home/HighlightDetail/@hl.Id" class="text-xs font-bold text-blue-600 hover:text-amber-500 transition-colors">Xem bộ sưu tập <i class="fas fa-chevron-right text-[9px] ml-1"></i></a>
                        </div>
                    </div>
                </div>
            }
        </div>
    </div>
</section>

<!-- Achievements Section -->
<section id="achievements" class="py-16 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-12">
            <span class="text-xs font-bold text-blue-600 uppercase tracking-widest">Bảng Vàng Thành Tích</span>
            <h3 class="text-3xl font-bold text-slate-900 mt-2 mb-4">Thành Tích & Huy Chương</h3>
            <p class="text-slate-600 text-sm sm:text-base">Niềm tự hào và kết quả nỗ lực không mệt mỏi của ban huấn luyện và võ sinh.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            @foreach (var ach in achievements)
            {
                <div class="bg-slate-50 rounded-xl p-6 border border-slate-100 flex gap-4 items-start shadow-xs">
                    <div class="h-12 w-12 rounded-lg flex items-center justify-center shrink-0 shadow-xs @(ach.MedalType == "Vàng" ? "bg-amber-100 text-amber-600" : ach.MedalType == "Bạc" ? "bg-slate-200 text-slate-600" : "bg-orange-100 text-orange-600")">
                        <i class="fas fa-trophy text-2xl"></i>
                    </div>
                    <div>
                        <span class="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 @(ach.MedalType == "Vàng" ? "bg-amber-100 text-amber-700" : ach.MedalType == "Bạc" ? "bg-slate-200 text-slate-700" : "bg-orange-100 text-orange-700")">Huy Chương @ach.MedalType</span>
                        <h4 class="font-bold text-slate-900 leading-tight">@ach.Title</h4>
                        <p class="text-xs text-slate-500 mt-1">Đơn vị: @ach.Unit</p>
                        <p class="text-[10px] text-slate-400 mt-2"><i class="far fa-calendar-alt"></i> @ach.Date.ToString("dd/MM/yyyy")</p>
                    </div>
                </div>
            }
        </div>
    </div>
</section>

<!-- Articles Section -->
<section class="py-16 bg-slate-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12">
            <div>
                <span class="text-xs font-bold text-blue-600 uppercase tracking-widest">Tin tức & Sự kiện</span>
                <h3 class="text-3xl font-bold text-slate-900 mt-2">Tin Tức Mới Nhất</h3>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            @foreach (var article in articles)
            {
                <div class="bg-white rounded-xl shadow-xs hover:shadow-md border border-slate-100 overflow-hidden transition-all flex flex-col h-full">
                    <div class="h-48 relative overflow-hidden bg-slate-100">
                        @if (!string.IsNullOrEmpty(article.Image))
                        {
                            <img src="@article.Image" alt="@article.Title" class="w-full h-full object-cover" />
                        }
                        else
                        {
                            <div class="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500"><i class="fas fa-newspaper text-4xl"></i></div>
                        }
                    </div>
                    <div class="p-6 flex-1 flex flex-col justify-between">
                        <div>
                            <span class="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md">Tin tức</span>
                            <h4 class="font-bold text-slate-900 text-base mt-2 line-clamp-2">@article.Title</h4>
                            <div class="text-xs text-slate-500 flex items-center gap-3 mt-3">
                                <span><i class="far fa-calendar mr-1"></i> @article.Date.ToString("dd/MM/yyyy")</span>
                                <span><i class="far fa-eye mr-1"></i> @article.Views lượt xem</span>
                            </div>
                        </div>
                        <div class="mt-6 pt-4 border-t border-slate-50">
                            <a href="/Home/ArticleDetail/@article.Id" class="text-xs font-bold text-blue-600 hover:text-amber-500 transition-colors">Đọc bài viết <i class="fas fa-arrow-right text-[9px] ml-1"></i></a>
                        </div>
                    </div>
                </div>
            }
        </div>
    </div>
</section>
  `.trim());

  viewsHomeFolder.file('ArticleDetail.cshtml', `
@model VovinamXomChieu.Web.Models.Article
@{
    var relatedArticles = ViewBag.RelatedArticles as List<Article> ?? new List<Article>();
}

<article class="py-12 bg-white">
    <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <a href="/" class="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-amber-500 transition-colors mb-6"><i class="fas fa-arrow-left"></i> Quay lại trang chủ</a>
        
        <header class="mb-8">
            <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider">@(Model.Category?.Name ?? "Tin tức")</span>
            <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 mb-4 leading-tight">@Model.Title</h1>
            <div class="flex items-center gap-4 text-xs text-slate-500 border-y border-slate-100 py-3">
                <span><i class="far fa-calendar-alt"></i> @Model.Date.ToString("dd/MM/yyyy")</span>
                <span><i class="far fa-eye"></i> @Model.Views lượt xem</span>
            </div>
        </header>

        @if (!string.IsNullOrEmpty(Model.Image))
        {
            <div class="aspect-video rounded-2xl overflow-hidden shadow-md mb-8 bg-slate-100">
                <img src="@Model.Image" alt="@Model.Title" class="w-full h-full object-cover" />
            </div>
        }

        <div class="prose prose-blue max-w-none text-slate-700 leading-relaxed text-sm sm:text-base space-y-6">
            @Html.Raw(Model.Content.Replace("\n", "<br/>"))
        </div>

        @if (relatedArticles.Any())
        {
            <section class="border-t border-slate-100 mt-12 pt-12">
                <h3 class="font-bold text-slate-900 text-lg mb-6">Bài viết liên quan</h3>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    @foreach (var rel in relatedArticles)
                    {
                        <div class="bg-slate-50 rounded-xl overflow-hidden border border-slate-100 p-4 flex flex-col justify-between h-full shadow-xs">
                            <div>
                                <h4 class="font-bold text-slate-900 text-sm line-clamp-2">@rel.Title</h4>
                                <span class="text-[10px] text-slate-400 mt-2 block">@rel.Date.ToString("dd/MM/yyyy")</span>
                            </div>
                            <a href="/Home/ArticleDetail/@rel.Id" class="text-xs font-bold text-blue-600 hover:text-amber-500 transition-colors mt-4 block">Xem thêm <i class="fas fa-chevron-right text-[8px] ml-1"></i></a>
                        </div>
                    }
                </div>
            </section>
        }
    </div>
</article>
  `.trim());

  viewsHomeFolder.file('ClubDetail.cshtml', `
@model VovinamXomChieu.Web.Models.Club

<section class="py-12 bg-white">
    <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <a href="/" class="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-amber-500 transition-colors mb-6"><i class="fas fa-arrow-left"></i> Quay lại trang chủ</a>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div class="aspect-video rounded-2xl overflow-hidden shadow-md bg-slate-100">
                @if (!string.IsNullOrEmpty(Model.Image))
                {
                    <img src="@Model.Image" alt="@Model.Name" class="w-full h-full object-cover" />
                }
                else
                {
                    <div class="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500"><i class="fas fa-map-marked-alt text-5xl"></i></div>
                }
            </div>

            <div>
                <span class="text-xs font-bold text-blue-600 uppercase tracking-widest">Thông tin chi tiết</span>
                <h1 class="text-3xl font-extrabold text-slate-900 mt-2 mb-4">@Model.Name</h1>
                
                <div class="space-y-4 text-sm sm:text-base text-slate-600 mt-6">
                    <p class="flex items-start gap-3"><i class="fas fa-map-marker-alt text-slate-400 mt-1"></i> <span><strong class="text-slate-800">Địa chỉ:</strong> @Model.Address</span></p>
                    <p class="flex items-center gap-3"><i class="fas fa-user-shield text-slate-400"></i> <span><strong class="text-slate-800">Huấn luyện viên phụ trách:</strong> @Model.HeadCoach</span></p>
                    <p class="flex items-center gap-3"><i class="fas fa-calendar-alt text-slate-400"></i> <span><strong class="text-slate-800">Ngày tập:</strong> @Model.TrainingDays</span></p>
                    <p class="flex items-center gap-3"><i class="fas fa-clock text-slate-400"></i> <span><strong class="text-slate-800">Giờ tập:</strong> @Model.TrainingHours</span></p>
                    <p class="flex items-center gap-3"><i class="fas fa-check-circle text-emerald-500"></i> <span><strong class="text-slate-800">Trạng thái:</strong> Hoạt động thường xuyên</span></p>
                </div>
            </div>
        </div>

        <div class="mt-12">
            <h3 class="font-bold text-slate-900 text-lg mb-4">Bản đồ vị trí sân tập</h3>
            <div class="aspect-video rounded-2xl overflow-hidden shadow-inner border border-slate-100 bg-slate-100 relative">
                <iframe 
                    width="100%" 
                    height="100%" 
                    frameborder="0" 
                    scrolling="no" 
                    marginheight="0" 
                    marginwidth="0" 
                    src="https://maps.google.com/maps?q=@(Uri.EscapeDataString(Model.Address))&t=&z=15&ie=UTF8&iwloc=&output=embed"
                    style="border:0;"
                    allowfullscreen=""
                    loading="lazy">
                </iframe>
            </div>
        </div>
    </div>
</section>
  `.trim());

  viewsHomeFolder.file('HighlightDetail.cshtml', `
@model VovinamXomChieu.Web.Models.Highlight

<section class="py-12 bg-white">
    <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <a href="/" class="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-amber-500 transition-colors mb-6"><i class="fas fa-arrow-left"></i> Quay lại trang chủ</a>

        <header class="mb-8">
            <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider"><i class="fas fa-photo-film"></i> @Model.MediaType</span>
            <h1 class="text-3xl font-extrabold text-slate-900 mt-2 mb-3">@Model.Title</h1>
            <p class="text-xs text-slate-500"><i class="fas fa-running text-slate-400"></i> Võ sĩ / Athlete: @Model.AthleteName</p>
        </header>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
            @if (Model.MediaUrls != null && Model.MediaUrls.Any())
            {
                @foreach (var media in Model.MediaUrls)
                {
                    <div class="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-md transition-all group">
                        <div class="aspect-square relative overflow-hidden bg-slate-100">
                            @if (Model.MediaType == "video")
                            {
                                <iframe class="w-full h-full" src="@media.MediaUrl.Replace("watch?v=", "embed/")" frameborder="0" allowfullscreen></iframe>
                            }
                            else
                            {
                                <img src="@media.MediaUrl" alt="Media" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                            }
                        </div>
                    </div>
                }
            }
            else if (!string.IsNullOrEmpty(Model.Thumbnail))
            {
                <div class="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                    <div class="aspect-square relative overflow-hidden">
                        <img src="@Model.Thumbnail" alt="@Model.Title" class="w-full h-full object-cover" />
                    </div>
                </div>
            }
        </div>
    </div>
</section>
  `.trim());

  // Generate the zip binary blob
  return await zip.generateAsync({ type: 'blob' });
}
